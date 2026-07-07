from __future__ import annotations

from .schema_registry import SchemaPlaceholder

play_embedding = SchemaPlaceholder(
    name="play_embedding",
    required_columns=(
        "source",
        "season",
        "week",
        "game_id",
        "play_id",
        "team_id",
        "model_version",
        "dataset_version",
    ),
    description="Phase 0 placeholder for persisted play embeddings.",
)

