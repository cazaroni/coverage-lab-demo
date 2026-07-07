from __future__ import annotations

from datetime import date
from typing import Literal
from pydantic import BaseModel, Field
from uuid import UUID


class PlayDetail(BaseModel):
    play_id: str
    game_id: str
    team_id: UUID
    season: int
    week: int
    dci: float | None = None
    dis: float | None = None
    dataset_version: str | None = None
    model_version: str | None = None


class GamePlaySummary(BaseModel):
    play_id: str
    game_id: str
    offense_team_id: str | None = None
    defense_team_id: str | None = None
    dci: float | None = None
    dis: float | None = None


class TeamDCIDistributionPoint(BaseModel):
    bucket: str
    count: int = Field(ge=0)


class ExplosivePlayMatch(BaseModel):
    play_id: str
    game_id: str
    preceding_dis: float
    explosive_gain_yards: int | None = None


class PlayerStressResilienceRow(BaseModel):
    player_id: str
    team_id: UUID
    resilience_score: float
    samples: int = Field(ge=0)


class TeamDISTrendPoint(BaseModel):
    team_id: UUID
    week: int
    observed_on: date | None = None
    dis_average: float


class PlayMovementFrame(BaseModel):
    play_id: str
    game_id: str
    source_play_id: int
    frame_id: int
    nfl_id: int
    player_label: str
    player_position: str
    player_side: str
    x: float
    y: float
    s: float
    o: float
    dir: float
    node_stress: float
    frame_dci: float
    frame_dis: float


# ─── Player Profile ────────────────────────────────────────────────────────────


class PlayerIdentity(BaseModel):
    nfl_id: int
    display_name: str
    position: str
    team_id: str


class PlayerHeadlineMetrics(BaseModel):
    avg_node_stress: float
    avg_dci_while_on_field: float | None = None
    avg_dis_while_on_field: float | None = None
    plays_tracked: int
    games_tracked: int


class PlayerTrendPoint(BaseModel):
    week: int
    avg_node_stress: float
    game_id: str | None = None


class PlayerStressEvent(BaseModel):
    play_id: str
    game_id: str
    week: int
    node_stress: float
    dci: float | None = None
    dis: float | None = None


class PlayerProfile(BaseModel):
    identity: PlayerIdentity
    headline: PlayerHeadlineMetrics
    trend: list[PlayerTrendPoint]
    top_stress_events: list[PlayerStressEvent]


# ─── Drive Replay ──────────────────────────────────────────────────────────────


class DriveSummary(BaseModel):
    drive_id: str
    game_id: str
    team_id: str
    season: int
    week: int
    play_count: int = Field(ge=0)
    start_yard_line: int | None = None
    result: str | None = None


class DrivePlayClip(BaseModel):
    play_id: str
    clip_index: int
    frame_start: int
    frame_end: int
    offense_team_id: str | None = None
    defense_team_id: str | None = None
    dci: float | None = None
    dis: float | None = None


class DriveMovementFrame(BaseModel):
    frame_id: int
    play_id: str
    clip_index: int
    is_bridge: bool
    nfl_id: int
    player_label: str
    player_position: str
    player_side: str
    x: float
    y: float
    s: float
    o: float
    dir: float
    node_stress: float


# ─── Roster ────────────────────────────────────────────────────────────────────


class RosterPlayer(BaseModel):
    nfl_id: int
    player_id: str
    display_name: str
    position: str
    player_side: str
    team_id: str
    avg_node_stress: float
    avg_dci_while_on_field: float | None = None
    avg_dis_while_on_field: float | None = None
    plays_tracked: int
    games_tracked: int
    resilience_score: float


# ─── Forensics ────────────────────────────────────────────────────────────────


class CollapseWindow(BaseModel):
    start_frame: int
    end_frame: int


class PlayForensics(BaseModel):
    play_id: str
    team_id: str
    dci: float
    dis: float
    model_version: str
    archetype_label: str
    has_motion: bool = True  # False -> headline scores only; per-frame fields are null
    peak_stress_frame: int | None = None
    peak_stress_entity_id: str | None = None
    peak_stress_value: float | None = None
    collapse_window: CollapseWindow | None = None
    plain_text_summary: str


# ─── Integrity trends ────────────────────────────────────────────────────────


class TeamIntegrityPoint(BaseModel):
    week: int
    avg_dci: float
    avg_dis: float
    play_count: int
