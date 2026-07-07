from __future__ import annotations

from pydantic import BaseModel


class TeamIntegrityPointDTO(BaseModel):
    week: int
    avg_dci: float
    avg_dis: float
    play_count: int


class TeamIntegrityTrendResponse(BaseModel):
    team_id: str
    season: int
    points: list[TeamIntegrityPointDTO]
