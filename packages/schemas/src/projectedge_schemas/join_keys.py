"""Stable join-key contract shared across canonical datasets."""

from __future__ import annotations

from typing import Final

REQUIRED_JOIN_KEYS: Final[tuple[str, ...]] = (
    "source",
    "season",
    "week",
    "game_id",
    "play_id",
    "frame_id",
    "player_id",
    "team_id",
    "model_version",
    "dataset_version",
    "payload_schema_version",
)
