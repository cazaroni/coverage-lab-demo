"""Tests for the deterministic geometric scorer and the /score endpoint."""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from projectedge_inference.app import create_app
from projectedge_inference.manifest import validate_bundle_manifest
from projectedge_inference.proto import inference_pb2
from projectedge_inference.scorer import GeometricScorer, compute_scores

BUNDLE = Path(__file__).resolve().parents[1] / "bundle"


def _payload() -> inference_pb2.GraphPayload:
    payload = inference_pb2.GraphPayload(payload_schema_version="v1")
    for eid, role, off in [("1", "CB", False), ("2", "S", False), ("9", "WR", True)]:
        payload.entities.append(inference_pb2.Entity(entity_id=eid, role=role, is_offense=off))
    for fi, (x1, x2) in enumerate([(10.0, 18.0), (11.0, 17.0), (12.0, 19.0)]):
        frame = inference_pb2.Frame(frame_index=fi)
        frame.entity_states.append(inference_pb2.EntityState(entity_id="1", x=x1, y=20.0, is_present=True))
        frame.entity_states.append(inference_pb2.EntityState(entity_id="2", x=x2, y=26.0, is_present=True))
        frame.entity_states.append(inference_pb2.EntityState(entity_id="9", x=40.0, y=23.0, is_present=True))
        payload.features_by_frame.append(frame)
    return payload


def test_compute_scores_deterministic_and_bounded():
    payload = _payload()
    first = compute_scores(payload)
    second = compute_scores(payload)
    assert first == second  # deterministic
    assert 0.0 <= first["dci"] <= 1.0
    assert 0.0 <= first["dis"] <= 1.0
    assert first["score_status"] == "scored"
    # Offense entity is not scored for stress; both defenders are.
    assert set(first["entity_stress"]) == {"1", "2"}


def test_scorer_from_bundle_reports_version():
    scorer = GeometricScorer.from_bundle(BUNDLE)
    assert scorer.model_version == "geom-fake-v1"
    assert scorer.centroids.shape == (3, 2)


def test_hash_parity_recompute_matches_sha256_of_payload_bytes():
    payload = _payload()
    canonical_bytes = payload.SerializeToString(deterministic=True)
    resp = GeometricScorer.from_bundle(BUNDLE).score(
        inference_pb2.ScoreRequest(payload=payload)
    )
    # Inference recomputes from the parsed sub-message; it must equal the SHA-256
    # the backend computes over the standalone GraphPayload bytes (ADR-0001).
    assert resp.payload_hash == hashlib.sha256(canonical_bytes).hexdigest()


def test_score_endpoint_returns_protobuf(monkeypatch):
    monkeypatch.setenv("INFERENCE_BUNDLE_ROOT", str(BUNDLE))
    with TestClient(create_app()) as client:
        assert client.get("/readyz").status_code == 200
        req = inference_pb2.ScoreRequest(payload=_payload(), model_version="geom-fake-v1")
        r = client.post(
            "/score",
            content=req.SerializeToString(deterministic=True),
            headers={"content-type": "application/x-protobuf"},
        )
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/x-protobuf")
        out = inference_pb2.ScoreResponse()
        out.ParseFromString(r.content)
        assert out.model_version == "geom-fake-v1"
        assert out.result.score_status == "scored"
        assert len(out.result.frame_scores) == 3


def test_readyz_not_ready_without_complete_bundle(monkeypatch, tmp_path):
    monkeypatch.setenv("INFERENCE_BUNDLE_ROOT", str(tmp_path / "missing"))
    with TestClient(create_app()) as client:
        assert client.get("/readyz").status_code == 503
        # /score is gated on readiness.
        assert client.post("/score", content=b"").status_code == 503


def test_corrupt_artifact_fails_bundle_validation(tmp_path):
    # A present-but-corrupt artifact must fail validation (digest mismatch), not
    # load silently as a ready bundle.
    dest = tmp_path / "bundle"
    shutil.copytree(BUNDLE, dest)
    (dest / "calibrator.json").write_text("CORRUPTED", encoding="utf-8")
    with pytest.raises(ValueError):
        validate_bundle_manifest(dest)
    with pytest.raises(ValueError):
        GeometricScorer.from_bundle(dest)


def test_readyz_not_ready_with_corrupt_artifact(monkeypatch, tmp_path):
    dest = tmp_path / "bundle"
    shutil.copytree(BUNDLE, dest)
    (dest / "weights.json").write_text("not the real weights", encoding="utf-8")
    monkeypatch.setenv("INFERENCE_BUNDLE_ROOT", str(dest))
    with TestClient(create_app()) as client:
        assert client.get("/readyz").status_code == 503


# Cross-module hash invariant: the inference vendored proto+helper must produce the
# SAME hash the API and packages/proto produce for an identical payload. If this drifts,
# the API's fail-closed exact-match scoring path would 502 every score — fail here first.
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


def test_inference_proto_matches_cross_module_golden_hash():
    from projectedge_inference.proto.payload_hash import hash_graph_payload

    assert hash_graph_payload(_golden_payload()) == GOLDEN_PAYLOAD_HASH
