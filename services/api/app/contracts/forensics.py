from __future__ import annotations

from pydantic import BaseModel


class CollapseWindowDTO(BaseModel):
    start_frame: int
    end_frame: int


class PlayForensicsResponse(BaseModel):
    play_id: str
    team_id: str
    dci: float
    dis: float
    model_version: str
    archetype_label: str
    has_motion: bool = True
    peak_stress_frame: int | None = None
    peak_stress_entity_id: str | None = None
    peak_stress_value: float | None = None
    collapse_window: CollapseWindowDTO | None = None
    plain_text_summary: str
