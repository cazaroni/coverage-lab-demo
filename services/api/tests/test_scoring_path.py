"""Tests for the real scoring path: GraphPayload -> payload_hash -> cache ->
inference -> response. Covers the in-process fallback, dependency-injected fakes,
cache miss->hit, the x-model-version header, and batch scoring.

The fixture play is 2023090700_1300 (KC Week 1), which has a motion sample.
"""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_inference_client
from app.main import app
from app.proto import inference_pb2
from app.proto.payload_hash import hash_graph_payload
from app.scoring.cache import InMemoryScoreCache
from app.scoring.inference_client import InferenceClient, InferenceError

PLAY = "2023090700_1300"


class _VersionMismatchClient:
    """Returns a ScoreResponse reporting a DIFFERENT model than was requested."""

    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        resp = inference_pb2.ScoreResponse(model_version="remote-v2")
        resp.result.dci = 0.4
        resp.result.dis = 0.2
        resp.result.score_status = "scored"
        return resp


class _FailingInferenceClient:
    def __init__(self) -> None:
        self.calls = 0

    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        self.calls += 1
        raise InferenceError("boom")


class _EmptyResponseClient:
    """Default-constructed (blank) response — must not be cached as scored zeros."""

    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        return inference_pb2.ScoreResponse()


class _BadHashClient:
    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        resp = inference_pb2.ScoreResponse(model_version="geom-fake-v1", payload_hash="0" * 64)
        resp.result.dci = 0.4
        resp.result.dis = 0.2
        resp.result.score_status = "scored"
        return resp


class _NoStatusClient:
    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        # Correct version + hash so we reach (and fail) the status check.
        resp = inference_pb2.ScoreResponse(
            model_version="geom-fake-v1",
            payload_hash=hash_graph_payload(score_request.payload),
        )
        resp.result.dci = 0.4
        resp.result.dis = 0.2  # score_status deliberately left blank
        return resp


class _OmittedHashClient:
    """Correct version + status + plausible scores but NO payload_hash — a provenance
    failure that must be rejected (not cached under our trusted local hash)."""

    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        resp = inference_pb2.ScoreResponse(model_version="geom-fake-v1")  # payload_hash blank
        resp.result.dci = 0.123
        resp.result.dis = 0.987
        resp.result.score_status = "scored"
        return resp


class _BadScoreClient:
    """Correct version + hash + status but out-of-range / non-finite scores — must be
    rejected so corrupt values never enter the durable cache."""

    def __init__(self, dci: float, dis: float) -> None:
        self._dci = dci
        self._dis = dis

    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        resp = inference_pb2.ScoreResponse(
            model_version="geom-fake-v1",
            payload_hash=hash_graph_payload(score_request.payload),
        )
        resp.result.dci = self._dci
        resp.result.dis = self._dis
        resp.result.score_status = "scored"
        return resp


class _FakeInferenceClient:
    """Returns a canned ScoreResponse — proves the route is driven through
    Depends(get_inference_client) so dependency_overrides actually injects."""

    def __init__(self) -> None:
        self.calls = 0

    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        self.calls += 1
        # A faithful fake echoes the canonical payload_hash, like the real service.
        resp = inference_pb2.ScoreResponse(
            model_version="geom-fake-v1",
            payload_hash=hash_graph_payload(score_request.payload),
        )
        resp.result.dci = 0.5
        resp.result.dis = 0.25
        resp.result.score_status = "scored"
        resp.result.frame_scores.append(inference_pb2.FrameScore(frame_index=0, dci=0.5, dis=0.25))
        return resp


def test_score_uses_injected_client_and_caches():
    fake = _FakeInferenceClient()
    app.dependency_overrides[get_inference_client] = lambda: fake
    try:
        with TestClient(app) as client:
            # In-memory cache is the dev/test backend (no DATABASE_URL).
            assert isinstance(app.state.score_cache, InMemoryScoreCache)

            r1 = client.post(f"/plays/{PLAY}/score")
            assert r1.status_code == 200
            body1 = r1.json()
            assert body1["cached"] is False
            assert len(body1["payload_hash"]) == 64
            assert all(c in "0123456789abcdef" for c in body1["payload_hash"])
            assert r1.headers["x-model-version"] == body1["model_version"] == "geom-fake-v1"
            assert body1["score_response"]["dci"] == 0.5
            assert body1["score_response"]["score_status"] == "scored"

            # Second call is a cache hit — inference is NOT called again.
            r2 = client.post(f"/plays/{PLAY}/score")
            body2 = r2.json()
            assert body2["cached"] is True
            assert body2["payload_hash"] == body1["payload_hash"]
            assert body2["score_response"]["dci"] == 0.5
            assert fake.calls == 1
    finally:
        app.dependency_overrides.clear()


def test_score_in_process_fallback_sets_header_and_real_hash():
    # No override: exercises the real in-process geometric fallback scorer.
    with TestClient(app) as client:
        r = client.post(f"/plays/{PLAY}/score")
        assert r.status_code == 200
        body = r.json()
        assert len(body["payload_hash"]) == 64
        assert r.headers["x-model-version"] == "geom-fake-v1"
        assert 0.0 <= body["score_response"]["dci"] <= 1.0
        assert 0.0 <= body["score_response"]["dis"] <= 1.0
        assert len(body["score_response"]["frame_scores"]) > 0


def test_batch_score_skips_missing_plays():
    with TestClient(app) as client:
        r = client.post("/plays/batch-score", json=[PLAY, "does_not_exist"])
        assert r.status_code == 200
        results = r.json()
        assert len(results) == 1
        assert results[0]["model_version"] == "geom-fake-v1"
        assert len(results[0]["payload_hash"]) == 64


def test_score_missing_play_returns_404():
    with TestClient(app) as client:
        r = client.post("/plays/nonexistent_play/score")
        assert r.status_code == 404


def test_score_rejects_model_version_mismatch_and_does_not_cache():
    # If the inference service serves a different bundle than the requested pin,
    # the result must not be stored under the wrong model identity (ADR-0001).
    app.dependency_overrides[get_inference_client] = lambda: _VersionMismatchClient()
    try:
        with TestClient(app) as client:
            r1 = client.post(f"/plays/{PLAY}/score")
            assert r1.status_code == 502
            # Not cached: a second call is still a 502 (no silent wrong-identity hit).
            r2 = client.post(f"/plays/{PLAY}/score")
            assert r2.status_code == 502
    finally:
        app.dependency_overrides.clear()


def test_single_score_inference_failure_is_502_and_uncached():
    fake = _FailingInferenceClient()
    app.dependency_overrides[get_inference_client] = lambda: fake
    try:
        with TestClient(app) as client:
            assert client.post(f"/plays/{PLAY}/score").status_code == 502
            assert client.post(f"/plays/{PLAY}/score").status_code == 502
            assert fake.calls == 2  # errors are never cached -> inference retried
    finally:
        app.dependency_overrides.clear()


def test_batch_isolates_inference_failures_without_aborting():
    app.dependency_overrides[get_inference_client] = lambda: _FailingInferenceClient()
    try:
        with TestClient(app) as client:
            r = client.post("/plays/batch-score", json=[PLAY, "does_not_exist"])
            assert r.status_code == 200  # one bad play does not 500 the batch
            results = r.json()
            assert len(results) == 1
            assert results[0]["score_response"]["score_status"] == "error"
    finally:
        app.dependency_overrides.clear()


def test_inference_client_wraps_transport_errors_as_inference_error():
    # A down/unreachable inference service must raise InferenceError (the type the
    # route handles), not a raw httpx transport error that would 500.
    client = InferenceClient(
        base_url="http://127.0.0.1:9", model_version="geom-fake-v1", timeout_seconds=1
    )
    with pytest.raises(InferenceError):
        asyncio.run(client.score(inference_pb2.ScoreRequest()))


def test_empty_inference_response_is_rejected_and_uncached():
    # ScoreResponse() has a blank model_version -> fails the strict identity check,
    # so it is NOT cached as scored zeros.
    app.dependency_overrides[get_inference_client] = lambda: _EmptyResponseClient()
    try:
        with TestClient(app) as client:
            assert client.post(f"/plays/{PLAY}/score").status_code == 502
            assert client.post(f"/plays/{PLAY}/score").status_code == 502  # not cached
    finally:
        app.dependency_overrides.clear()


def test_payload_hash_mismatch_is_rejected():
    app.dependency_overrides[get_inference_client] = lambda: _BadHashClient()
    try:
        with TestClient(app) as client:
            assert client.post(f"/plays/{PLAY}/score").status_code == 502
    finally:
        app.dependency_overrides.clear()


def test_omitted_payload_hash_is_rejected_and_uncached():
    # ADR-0001 requires a payload_hash on every response; a blank one is a provenance
    # failure even when the version/status/scores look plausible.
    app.dependency_overrides[get_inference_client] = lambda: _OmittedHashClient()
    try:
        with TestClient(app) as client:
            assert client.post(f"/plays/{PLAY}/score").status_code == 502
            assert client.post(f"/plays/{PLAY}/score").status_code == 502  # not cached
    finally:
        app.dependency_overrides.clear()


def test_missing_score_status_is_rejected():
    app.dependency_overrides[get_inference_client] = lambda: _NoStatusClient()
    try:
        with TestClient(app) as client:
            assert client.post(f"/plays/{PLAY}/score").status_code == 502
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "dci,dis",
    [(42.0, -1.0), (float("nan"), 0.5), (float("inf"), 0.5)],
)
def test_out_of_range_or_nonfinite_scores_rejected_and_uncached(dci, dis):
    app.dependency_overrides[get_inference_client] = lambda: _BadScoreClient(dci, dis)
    try:
        with TestClient(app) as client:
            assert client.post(f"/plays/{PLAY}/score").status_code == 502
            assert client.post(f"/plays/{PLAY}/score").status_code == 502  # not cached
    finally:
        app.dependency_overrides.clear()


# Canonical golden payload — exercises sorted-map metadata + float x/y. The same hash
# is asserted in the inference and packages/proto suites; if any vendored proto module
# drifts (or protobuf majors change) the strict exact-match scoring path would 502
# everything, so this fails loudly first.
GOLDEN_PAYLOAD_HASH = "1b25a0cfb03fae369284bbe29a6600be87d329ec1d72d6d9664cc8c701c8dca1"


def _golden_payload() -> inference_pb2.GraphPayload:
    payload = inference_pb2.GraphPayload(payload_schema_version="v1")
    payload.metadata["zeta"] = "1"
    payload.metadata["alpha"] = "2"
    payload.metadata["mid"] = "3"
    for eid, role, off in [("2", "S", False), ("1", "CB", False), ("9", "WR", True)]:
        payload.entities.append(inference_pb2.Entity(entity_id=eid, role=role, is_offense=off))
    for fi, (x1, x2) in enumerate([(10.5, 18.25), (11.0, 17.75)]):
        frame = inference_pb2.Frame(frame_index=fi)
        frame.entity_states.append(
            inference_pb2.EntityState(entity_id="1", x=x1, y=20.0, speed=0.0, direction_degrees=0.0, is_present=True)
        )
        frame.entity_states.append(
            inference_pb2.EntityState(entity_id="2", x=x2, y=26.0, speed=0.0, direction_degrees=0.0, is_present=True)
        )
        payload.features_by_frame.append(frame)
    return payload


def test_api_proto_matches_cross_module_golden_hash():
    assert hash_graph_payload(_golden_payload()) == GOLDEN_PAYLOAD_HASH


def test_ddl_split_ignores_comment_semicolons():
    # The startup DDL has a ';' inside a comment; ensure the splitter yields only
    # real statements (no "this is the ..." fragment) so ensure_schema won't crash.
    from pathlib import Path

    from app.scoring.cache import _split_sql

    ddl = (
        Path(__file__).resolve().parents[1] / "app" / "db" / "sql" / "0001_ml_play_scores.sql"
    ).read_text(encoding="utf-8")
    statements = _split_sql(ddl)
    assert statements
    for stmt in statements:
        assert stmt.upper().startswith(("CREATE", "ALTER", "DROP")), stmt[:50]
