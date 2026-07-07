"""Assemble the canonical GraphPayload from a play's movement frames and compute
the ADR-0001 payload_hash over it.

Identity is *geometry-only*: it is defined by the entity roster + per-frame
positions, never by ``play_id`` (play_id is provenance — stored on the cache row,
never hashed). Ordering is fixed (entities, frames, and per-frame states all
sorted by id) so the deterministic protobuf serialization — and therefore the
hash — is byte-stable across processes and across the API/inference boundary.

NOTE: this builds GraphPayload's own messages (Frame / Entity / EntityState). It
is *not* the replay EntityPosition/ReplayFrame shape; services/realtime/app/
streamer.py is only a reference for the frame grouping, not the message types.

The source data has no speed/orientation/direction columns — the analytics engine
hardcodes s=o=dir=0 (see packages/.../bigdatabowl_engine.py). We populate
speed/direction_degrees with those zeros honestly; the geometric scorer uses x/y.
"""

from __future__ import annotations

from app.proto import inference_pb2
from app.proto.payload_hash import hash_graph_payload
from projectedge_analytics.models import PlayMovementFrame


def build_graph_payload(
    frames: list[PlayMovementFrame],
    *,
    schema_version: str,
) -> inference_pb2.GraphPayload:
    payload = inference_pb2.GraphPayload(payload_schema_version=schema_version)

    # Stable entity roster: one Entity per nfl_id, ordered by nfl_id.
    first_seen: dict[int, PlayMovementFrame] = {}
    for frame in frames:
        first_seen.setdefault(frame.nfl_id, frame)
    for nfl_id in sorted(first_seen):
        frame = first_seen[nfl_id]
        payload.entities.append(
            inference_pb2.Entity(
                entity_id=str(nfl_id),
                role=frame.player_position,
                is_offense=(frame.player_side == "Offense"),
            )
        )

    # Frames in temporal order; entity states ordered by nfl_id within each frame.
    by_frame: dict[int, list[PlayMovementFrame]] = {}
    for frame in frames:
        by_frame.setdefault(frame.frame_id, []).append(frame)
    for frame_id in sorted(by_frame):
        frame_msg = inference_pb2.Frame(frame_index=frame_id)
        for row in sorted(by_frame[frame_id], key=lambda r: r.nfl_id):
            frame_msg.entity_states.append(
                inference_pb2.EntityState(
                    entity_id=str(row.nfl_id),
                    x=row.x,
                    y=row.y,
                    speed=row.s,
                    direction_degrees=row.dir,
                    is_present=True,
                )
            )
        payload.features_by_frame.append(frame_msg)

    return payload


def compute_payload_hash(payload: inference_pb2.GraphPayload) -> str:
    """ADR-0001 canonical hash: SHA-256 over deterministic GraphPayload bytes."""
    return hash_graph_payload(payload)
