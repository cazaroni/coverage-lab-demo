"""Dataset manifest models for lake contract metadata."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ManifestProvenance(BaseModel):
    """Source lineage metadata for a manifest artifact."""

    run_id: str | None = Field(
        default=None,
        description="Workflow run identifier, if available.",
    )
    source_uri: str | None = Field(
        default=None,
        description="Primary upstream dataset URI or object path.",
    )
    notes: str | None = Field(
        default=None,
        description="Free-form metadata for Phase 0 placeholders.",
    )
    extra: dict[str, Any] = Field(default_factory=dict)


class DatasetManifest(BaseModel):
    """Canonical dataset manifest contract (Phase 0 baseline)."""

    dataset: str
    dataset_version: str
    schema_version: str
    source: str
    season: int | str
    week: int | str
    game_id: str
    model_version: str | None = None
    payload_schema_version: str
    row_count: int = Field(ge=0)
    checksum: str
    created_at: datetime
    created_by: str
    provenance: ManifestProvenance
