from __future__ import annotations

from .schema_registry import SchemaPlaceholder

play_score_summary = SchemaPlaceholder(
    name="play_score_summary",
    required_columns=(
        "source",
        "season",
        "week",
        "game_id",
        "play_id",
        "team_id",
        "model_version",
        "dataset_version",
        "payload_schema_version",
    ),
    description="Phase 0 placeholder for scored play summaries persisted in the lake.",
)

