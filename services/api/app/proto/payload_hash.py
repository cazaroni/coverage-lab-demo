"""Reference payload_hash implementation from ADR-0001."""

from __future__ import annotations

import hashlib
from google.protobuf.message import Message


def serialize_graph_payload(payload: Message) -> bytes:
    """Serialize GraphPayload using deterministic protobuf encoding."""
    return payload.SerializeToString(deterministic=True)


def hash_graph_payload(payload: Message) -> str:
    """Compute lowercase hex SHA-256 over deterministic GraphPayload bytes."""
    canonical_bytes = serialize_graph_payload(payload)
    return hashlib.sha256(canonical_bytes).hexdigest()

