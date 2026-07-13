"""Phase 4 DoD benchmark for the intelligence layer (deterministic path).

ARCHITECTURE.md §6 Phase 4: "50-prompt benchmark: ≥95% produce a valid, executed
tool call; reports render for any ingested game." intelligence-execution-plan.md §6
adds: 100% pass rate on adversarial guardrail cases.

The corpus lives in fixtures/intelligence_benchmark.json so prompts can be reviewed
and extended without touching the harness. Everything here runs against the
deterministic orchestrator — no LLM key required, CI-safe.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from uuid import UUID

import jwt
import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_session_context
from app.config import get_settings
from app.contracts.session import SessionContext
from app.main import app

_TESTS_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _TESTS_DIR.parents[2]
_FIXTURE = json.loads((_TESTS_DIR / "fixtures" / "intelligence_benchmark.json").read_text(encoding="utf-8"))
_PLAYS_CSV = _REPO_ROOT / "packages" / "schemas" / "fixtures" / "datasets" / "bigdatabowl_2023" / "plays.csv"

KC_TEAM_ID = UUID("00000000-0000-0000-0000-000000000001")
SEA_TEAM_ID = UUID("00000000-0000-0000-0000-000000000002")

CORE_PASS_THRESHOLD = 0.95
ALLOWED_INTENTS = {"find_plays", "explain_play", "team_trend"}
FIND_LIMIT_CAP = 25  # Toolbox.find_plays clamps to this


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as shared_client:
        yield shared_client


def _plays_by_team() -> dict[UUID, set[str]]:
    """Ground truth for tenancy assertions, parsed straight from the fixture CSV
    on purpose: deriving it through the analytics engine would validate the code
    path under test against itself."""
    teams: dict[UUID, set[str]] = {}
    with _PLAYS_CSV.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            teams.setdefault(UUID(row["team_context_id"]), set()).add(row["play_id"])
    return teams


_TEAM_PLAYS = _plays_by_team()
KC_PLAYS = _TEAM_PLAYS[KC_TEAM_ID]
SEA_PLAYS = _TEAM_PLAYS[SEA_TEAM_ID]


def _ask(client: TestClient, prompt: str, season: int | None = None):
    body: dict = {"question": prompt}
    if season is not None:
        body["season"] = season
    return client.post("/intelligence/query", json=body)


def _citations(report: dict) -> list[dict]:
    return [c for section in report["sections"] for c in section["citations"]]


def _validate_core_case(case: dict, report: dict) -> list[str]:
    """Return a list of failure descriptions (empty = pass)."""
    problems: list[str] = []
    if report["intent"] != case["intent"]:
        problems.append(f"intent {report['intent']!r} != expected {case['intent']!r}")
    if "title" in case and report["title"] != case["title"]:
        problems.append(f"title {report['title']!r} != expected {case['title']!r}")
    if "play_id" in case and case["play_id"] not in report["title"]:
        problems.append(f"expected play {case['play_id']} in title {report['title']!r}")
    if report["generated_by"] != "deterministic":
        problems.append(f"generated_by {report['generated_by']!r}")
    if not report["model_version"]:
        problems.append("missing model_version")

    citations = _citations(report)
    min_citations = case.get("min_citations", 1)
    if len(citations) < min_citations:
        problems.append(f"{len(citations)} citations < min {min_citations}")
    if "max_citations" in case and len(citations) > case["max_citations"]:
        problems.append(f"{len(citations)} citations > max {case['max_citations']}")
    for c in citations:
        if c["play_id"] not in KC_PLAYS:
            problems.append(f"citation {c['play_id']} is not a KC-context play (tenancy leak)")
        if c["deep_link"] != f"/plays/{c['play_id']}":
            problems.append(f"bad deep_link {c['deep_link']!r}")
        if not c["replay_token"]:
            problems.append(f"citation {c['play_id']} missing replay_token")
        if "week" in case and not c["label"].startswith(f"Wk{case['week']} "):
            problems.append(f"citation label {c['label']!r} not from week {case['week']}")
    return problems


def test_core_benchmark_pass_rate(client: TestClient):
    core = _FIXTURE["core"]
    assert len(core) == 50, f"core corpus must hold 50 prompts, has {len(core)}"

    failures: list[str] = []
    for case in core:
        response = _ask(client, case["prompt"])
        if response.status_code != 200:
            failures.append(f"{case['prompt']!r}: HTTP {response.status_code}")
            continue
        problems = _validate_core_case(case, response.json())
        if problems:
            failures.append(f"{case['prompt']!r}: " + "; ".join(problems))

    pass_rate = (len(core) - len(failures)) / len(core)
    detail = "\n".join(failures)
    assert pass_rate >= CORE_PASS_THRESHOLD, (
        f"benchmark pass rate {pass_rate:.2%} < {CORE_PASS_THRESHOLD:.0%} "
        f"({len(failures)}/{len(core)} failed):\n{detail}"
    )


@pytest.mark.parametrize("case", _FIXTURE["adversarial"], ids=lambda c: c["name"])
def test_adversarial_guardrails(case: dict, client: TestClient):
    """Guardrail cases must pass 100% — each is its own test so one failure
    names the exact hole."""
    prompt = case["prompt"] * case.get("repeat", 1)
    response = _ask(client, prompt, season=case.get("season"))

    expect = case["expect"]
    if expect == "http_422":
        assert response.status_code == 422, f"expected 422, got {response.status_code}"
        return

    assert response.status_code == 200, response.text
    report = response.json()
    assert report["intent"] in ALLOWED_INTENTS
    citations = _citations(report)
    leaked = [c["play_id"] for c in citations if c["play_id"] not in KC_PLAYS]
    assert not leaked, f"cross-team plays leaked into citations: {leaked}"
    assert len(citations) <= FIND_LIMIT_CAP

    if expect == "not_found":
        assert report["intent"] == "explain_play"
        assert "not found" in report["title"].lower()
        assert report["sections"] == []
    elif expect == "empty_results":
        assert report["sections"] == []
    elif expect == "typed_report":
        rendered = report["summary"] + " ".join(s["body"] for s in report["sections"])
        assert "<script>" not in rendered
        if case.get("min_citations", 1) >= 1:
            assert citations
    else:  # pragma: no cover - fixture authoring error
        pytest.fail(f"unknown expectation {expect!r}")


def test_replay_tokens_are_team_and_play_scoped(client: TestClient):
    """Citation replay tokens must be verifiable, team-bound, and play-bound —
    a leaked token must not open another team's film."""
    report = _ask(client, "What are my worst coverage plays this season?").json()
    citations = _citations(report)
    assert citations
    settings = get_settings()
    for c in citations:
        claims = jwt.decode(
            c["replay_token"],
            settings.replay_session_secret,
            algorithms=["HS256"],
            issuer="projectedge-api",
        )
        assert claims["team_id"] == str(KC_TEAM_ID)
        assert claims["sub"] == f"play:{c['play_id']}"
        assert c["play_id"] in KC_PLAYS


def test_tool_endpoint_rejects_invalid_arguments(client: TestClient):
    """Typed tool surface: invalid arguments must fail validation before touching
    data (intelligence-execution-plan.md §4)."""
    bad_sort = client.post(
        "/intelligence/tools/find-plays", json={"sort": "dci_asc; DROP TABLE plays"}
    )
    assert bad_sort.status_code == 422

    for bad_limit in (0, 16, -3):
        r = client.post("/intelligence/tools/find-plays", json={"limit": bad_limit})
        assert r.status_code == 422, f"limit={bad_limit} must be rejected"

    bad_week = client.post("/intelligence/tools/find-plays", json={"week": "1; --"})
    assert bad_week.status_code == 422


def test_report_renders_for_second_team_context():
    """DoD: 'reports render for any ingested game' — the second fixture team
    must get a fully-cited report scoped to its own plays."""
    sea_session = SessionContext(
        user_id="benchmark-sea-coach",
        active_team_id=SEA_TEAM_ID,
        role="coach",
        session_id="benchmark-sea",
        memberships=[],
        provider="test",
        team_name="SEA context",
    )
    app.dependency_overrides[get_session_context] = lambda: sea_session
    try:
        with TestClient(app) as client:
            response = _ask(client, "What are my worst coverage plays this season?")
            assert response.status_code == 200, response.text
            report = response.json()
            citations = _citations(report)
            assert citations, "SEA context must produce a cited report"
            for c in citations:
                assert c["play_id"] in SEA_PLAYS
                assert c["play_id"] not in KC_PLAYS
    finally:
        app.dependency_overrides.pop(get_session_context, None)
