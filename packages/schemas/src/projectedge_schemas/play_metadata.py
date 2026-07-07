from __future__ import annotations

from .schema_registry import SchemaPlaceholder

play_metadata = SchemaPlaceholder(
    name="play_metadata",
    required_columns=(
        "source",
        "season",
        "week",
        "game_id",
        "play_id",
        "team_id",
        "dataset_version",
    ),
    description="Phase 0 placeholder for normalized play-level metadata.",
)

