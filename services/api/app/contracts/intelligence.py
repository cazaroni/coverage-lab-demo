from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChatQuery(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    season: int | None = None


class Citation(BaseModel):
    """A play-link citation backing a claim in a report section."""

    play_id: str
    label: str  # e.g. "KC Wk1 — DCI 0.41 (Coverage stress)"
    deep_link: str  # frontend route, e.g. "/plays/2023090700_1300"
    replay_token: str | None = None  # short-lived JWT to open the replay directly


class ReportSection(BaseModel):
    heading: str
    body: str
    citations: list[Citation] = Field(default_factory=list)


class ChatReport(BaseModel):
    question: str
    intent: str
    title: str
    summary: str
    sections: list[ReportSection]
    model_version: str
    generated_by: Literal["deterministic", "claude"] = "deterministic"


# ── Granular tool surface (called by the Vercel AI SDK chat route) ───────────────
class FindPlaysToolRequest(BaseModel):
    season: int | None = None
    week: int | None = None
    min_dci: float | None = None
    max_dci: float | None = None
    sort: Literal["dci_asc", "dci_desc", "dis_desc"] = "dci_asc"
    limit: int = Field(default=5, ge=1, le=15)


class ToolPlay(BaseModel):
    play_id: str
    week: int
    opponent: str | None = None
    dci: float | None = None
    dis: float | None = None
    dci_label: str
    dis_label: str
    deep_link: str


class TeamContextPlay(BaseModel):
    play_id: str
    week: int
    opponent: str | None = None
    dci: float | None = None
    dis: float | None = None
    label: str
    deep_link: str


class TeamContext(BaseModel):
    """Compact, deterministic grounding briefing injected into the chatbot's
    system prompt so it always knows its scope (and never falsely says
    'I don't know' about basics)."""

    team_name: str
    season: int
    scored_play_count: int
    motion_play_count: int  # plays with per-frame film (forensics/replay); a subset of scored
    weeks_covered: list[int]
    season_avg_dci: float | None = None
    season_avg_dis: float | None = None
    season_dci_label: str
    season_dis_label: str
    weakest_play: TeamContextPlay | None = None
    tightest_play: TeamContextPlay | None = None
