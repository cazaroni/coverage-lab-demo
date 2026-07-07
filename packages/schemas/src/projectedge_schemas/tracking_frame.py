from __future__ import annotations

from .schema_registry import SchemaPlaceholder

tracking_frame = SchemaPlaceholder(
    name="tracking_frame",
    required_columns=(
        "source",
        "season",
        "week",
        "game_id",
        "play_id",
        "frame_id",
        "team_id",
        "player_id",
    ),
    description="Phase 0 placeholder for canonical tracking frame records.",
)

