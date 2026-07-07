from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class RequestContextDTO(BaseModel):
    team_id: UUID
    session_id: str
    trace_id: str | None = None
    request_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScorePlayPayload(BaseModel):
    """Backend-owned scoring envelope around the canonical GraphPayload."""

    request_context: RequestContextDTO
    graph_payload: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Phase 0 placeholder for the canonical GraphPayload defined by "
            "packages/proto/inference.proto."
        ),
    )
    model_version: str | None = None
    idempotency_key: str | None = Field(
        default=None,
        pattern=r"^[A-Za-z0-9_-]{1,128}$",
        description="See ADR-0001 for idempotency-key scope and semantics.",
    )


class ScorePlayResult(BaseModel):
    model_version: str
    payload_hash: str = Field(
        description="Canonical lowercase SHA-256 payload hash. See ADR-0001."
    )
    cached: bool = False
    score_response: dict[str, Any] = Field(
        default_factory=dict,
        description="Phase 0 placeholder for the canonical ScoreResponse projection.",
    )

