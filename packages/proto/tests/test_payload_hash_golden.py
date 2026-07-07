"""Golden hash test (ADR-0001). This is the canonical source the vendored copies in
services/api and services/inference must match — each service suite asserts the same
hex. If serialization drifts (protobuf major bump, regenerated stubs), this fails."""

import json
from pathlib import Path

import inference_pb2 as pb
from payload_hash import hash_graph_payload


def _canonical_payload() -> "pb.GraphPayload":
    payload = pb.GraphPayload(payload_schema_version="v1")
    # Unsorted insert order — deterministic serialization must sort map keys.
    payload.metadata["zeta"] = "1"
    payload.metadata["alpha"] = "2"
    payload.metadata["mid"] = "3"
    for eid, role, off in [("2", "S", False), ("1", "CB", False), ("9", "WR", True)]:
        payload.entities.append(pb.Entity(entity_id=eid, role=role, is_offense=off))
    for fi, (x1, x2) in enumerate([(10.5, 18.25), (11.0, 17.75)]):
        frame = pb.Frame(frame_index=fi)
        frame.entity_states.append(
            pb.EntityState(entity_id="1", x=x1, y=20.0, speed=0.0, direction_degrees=0.0, is_present=True)
        )
        frame.entity_states.append(
            pb.EntityState(entity_id="2", x=x2, y=26.0, speed=0.0, direction_degrees=0.0, is_present=True)
        )
        payload.features_by_frame.append(frame)
    return payload


def test_canonical_payload_hash_matches_golden() -> None:
    golden = json.loads(
        Path(__file__).with_name("payload_hash_golden.json").read_text(encoding="utf-8")
    )
    expected = golden["cases"][0]["payload_hash"]
    assert hash_graph_payload(_canonical_payload()) == expected
    assert len(expected) == 64  # lowercase hex SHA-256
