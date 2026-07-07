"""Tests for the Phase 4 intelligence layer (deterministic path — no LLM key)."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def _ask(client: TestClient, question: str, season: int | None = 2023) -> dict:
    body = {"question": question}
    if season is not None:
        body["season"] = season
    r = client.post("/intelligence/query", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_find_weakest_coverage_plays():
    with TestClient(app) as client:
        report = _ask(client, "What are my worst coverage plays this season?")
    assert report["intent"] == "find_plays"
    assert report["model_version"] == "geom-fake-v1"
    assert report["generated_by"] == "deterministic"
    assert report["sections"], "expected at least one section"
    citations = report["sections"][0]["citations"]
    assert citations, "expected play-link citations"
    for c in citations:
        assert c["deep_link"].startswith("/plays/")
        assert c["replay_token"]  # short-lived JWT to open the film
        assert "DCI" in c["label"]


def test_explain_specific_play():
    with TestClient(app) as client:
        report = _ask(client, "Why did play 2023090700_1300 break down?")
    assert report["intent"] == "explain_play"
    assert "2023090700_1300" in report["title"]
    assert report["summary"]
    section = report["sections"][0]
    assert section["citations"][0]["play_id"] == "2023090700_1300"
    assert "DCI" in section["body"]


def test_team_integrity_trend():
    with TestClient(app) as client:
        report = _ask(client, "Is my defense improving over the season?")
    assert report["intent"] == "team_trend"
    assert any(word in report["summary"] for word in ("improving", "declining", "holding steady"))
    assert "Week" in report["sections"][0]["body"]


def test_most_structural_drift():
    with TestClient(app) as client:
        report = _ask(client, "Show me the plays with the most structural drift in week 1")
    assert report["intent"] == "find_plays"
    assert report["title"] == "Highest structural drift"


def test_explain_missing_play_is_graceful():
    with TestClient(app) as client:
        report = _ask(client, "Explain play 9999999999_1")
    assert report["intent"] == "explain_play"
    assert "not found" in report["title"].lower()
    assert report["sections"] == []


def test_tool_find_plays_endpoint_returns_labeled_rows():
    with TestClient(app) as client:
        r = client.post("/intelligence/tools/find-plays", json={"sort": "dci_asc", "limit": 3})
    assert r.status_code == 200
    rows = r.json()
    assert 1 <= len(rows) <= 3
    # Sorted weakest-coverage-first.
    dcis = [row["dci"] for row in rows]
    assert dcis == sorted(dcis)
    for row in rows:
        assert row["deep_link"] == f"/plays/{row['play_id']}"
        assert row["dci_label"]


def test_team_context_briefing_grounds_the_assistant():
    with TestClient(app) as client:
        ctx = client.get("/intelligence/context").json()
    assert ctx["team_name"]
    assert ctx["season"] == 2023
    assert ctx["scored_play_count"] > 0
    assert ctx["weeks_covered"]
    assert ctx["season_dci_label"]  # plain-English label always present
    assert ctx["weakest_play"]["deep_link"].startswith("/plays/")


def test_context_distinguishes_film_backed_plays_from_scored():
    # The briefing must separate "scored" (headline DCI/DIS) from "has film"
    # (per-frame forensics/replay) so the chatbot doesn't promise film it lacks.
    with TestClient(app) as client:
        ctx = client.get("/intelligence/context").json()
    assert 1 <= ctx["motion_play_count"] <= ctx["scored_play_count"]


def test_explain_no_motion_play_does_not_fabricate_forensics():
    # A scored play with no motion sample must not get a fabricated collapse/integrity story.
    with TestClient(app) as client:
        report = _ask(client, "Explain play 2023090700_3461")
    assert report["intent"] == "explain_play"
    body = (report["summary"] + " " + report["sections"][0]["body"]).lower()
    assert "no tracking sample" in body
    assert "maintained structural integrity" not in body
    # No fabricated frame-level narration (the prior bug: "...reached 0.0 on unknown at frame 0").
    assert "on unknown at frame" not in body
    assert "stress reached" not in body


def test_raw_forensics_no_motion_nulls_per_frame_fields():
    # The raw /forensics contract must not surface fabricated 0/"unknown"/0.0 peaks;
    # per-frame fields are null and has_motion=false so the frontend can gate them.
    with TestClient(app) as client:
        motion = client.get("/plays/2023090700_1300/forensics").json()
        assert motion["has_motion"] is True
        assert motion["peak_stress_frame"] is not None

        no_motion = client.get("/plays/2023090700_3461/forensics").json()
        assert no_motion["has_motion"] is False
        assert no_motion["peak_stress_frame"] is None
        assert no_motion["peak_stress_entity_id"] is None
        assert no_motion["peak_stress_value"] is None


def test_ml_play_scores_ddl_enforces_rls():
    ddl = (
        Path(__file__).resolve().parents[1] / "app" / "db" / "sql" / "0001_ml_play_scores.sql"
    ).read_text(encoding="utf-8")
    assert "ENABLE ROW LEVEL SECURITY" in ddl
    assert "FORCE ROW LEVEL SECURITY" in ddl
    assert "CREATE POLICY" in ddl
    assert "app.current_team_id" in ddl
