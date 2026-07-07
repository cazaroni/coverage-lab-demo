from __future__ import annotations

from pydantic import BaseModel, Field


class GameSummary(BaseModel):
    game_id: str
    season: int
    week: int
    home_team_abbr: str | None = None
    away_team_abbr: str | None = None
    home_score: int | None = None
    away_score: int | None = None
    play_count: int = Field(ge=0)


class PlayListRow(BaseModel):
    play_id: str
    game_id: str
    season: int
    week: int
    dci: float | None = None
    dis: float | None = None
    offense_team_id: str | None = None
    defense_team_id: str | None = None
    thumbnail_url: str | None = None
