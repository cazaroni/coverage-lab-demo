"""Phase 0 schema registry placeholders."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final

from .join_keys import REQUIRED_JOIN_KEYS

REQUIRED_SCHEMA_NAMES: Final[tuple[str, ...]] = (
    "tracking_frame",
    "play_metadata",
    "play_embedding",
    "play_score_summary",
    "player_stress_summary",
)


@dataclass(frozen=True, slots=True)
class SchemaPlaceholder:
    """Lean placeholder for schema contracts before full validators land."""

    name: str
    schema_version: str = "0.0.1"
    required_keys: tuple[str, ...] = REQUIRED_JOIN_KEYS
    required_columns: tuple[str, ...] = field(default_factory=tuple)
    description: str = (
        "Phase 0 placeholder. Full field-level validation is targeted for later phases."
    )


class SchemaRegistry:
    """In-memory registry for shared schema contract placeholders."""

    def __init__(self) -> None:
        self._schemas: dict[str, SchemaPlaceholder] = {}
        for schema_name in REQUIRED_SCHEMA_NAMES:
            self.register(SchemaPlaceholder(name=schema_name))

    def register(self, placeholder: SchemaPlaceholder) -> None:
        self._schemas[placeholder.name] = placeholder

    def get(self, schema_name: str) -> SchemaPlaceholder:
        return self._schemas[schema_name]

    def list(self) -> tuple[SchemaPlaceholder, ...]:
        return tuple(self._schemas[name] for name in sorted(self._schemas.keys()))
