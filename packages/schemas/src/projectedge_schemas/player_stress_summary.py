from __future__ import annotations

from .schema_registry import SchemaPlaceholder

player_stress_summary = SchemaPlaceholder(
    name="player_stress_summary",
    required_columns=(
        "source",
        "season",
        "week",
        "game_id",
        "play_id",
        "team_id",
        "player_id",
        "model_version",
        "dataset_version",
    ),
    description="Phase 0 placeholder for player stress summaries derived from scored plays.",
)

