"""Typed, team-scoped tools the chatbot can call. Each wraps an existing analytics
capability and returns structured data — no LLM, no cross-team leakage (every call
is scoped to the caller's team_id)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.config import Settings
from app.contracts import PlayListRow, ReplaySessionResponse
from app.frontend_reads import Phase1FrontendReadBridge
from app.replay_tokens import issue_replay_token
from projectedge_analytics import (
    BigDataBowlAnalyticsEngine,
    PlayForensics,
    TeamIntegrityPoint,
)


@dataclass
class Toolbox:
    """The bound tool surface for one (team, season) context."""

    engine: BigDataBowlAnalyticsEngine
    frontend_reads: Phase1FrontendReadBridge
    settings: Settings
    team_id: UUID
    season: int

    def find_plays(
        self,
        *,
        week: int | None = None,
        min_dci: float | None = None,
        max_dci: float | None = None,
        sort: str = "dci_asc",
        limit: int = 5,
    ) -> list[PlayListRow]:
        """Find plays for the team, filtered/sorted by coverage scores.

        sort: 'dci_asc' (worst coverage first), 'dci_desc', 'dis_desc' (most drift).
        """
        rows = [
            row
            for row in self.frontend_reads.list_catalog_plays(
                team_id=self.team_id,
                season=self.season,
                week=week,
                min_dci=min_dci,
                max_dci=max_dci,
            )
            if row.dci is not None
        ]
        reverse = sort.endswith("desc")
        if sort.startswith("dis"):
            rows.sort(key=lambda r: (r.dis if r.dis is not None else 0.0), reverse=reverse)
        else:
            rows.sort(key=lambda r: r.dci, reverse=reverse)
        return rows[: max(1, min(limit, 25))]

    def explain_play(self, *, play_id: str) -> PlayForensics:
        """Full forensics for one play: dci/dis, archetype, peak stress, collapse
        window, and a plain-text summary."""
        return self.engine.get_play_forensics(play_id=play_id, team_id=self.team_id)

    def team_integrity_trend(self) -> list[TeamIntegrityPoint]:
        """Weekly avg DCI/DIS for the team this season (improving vs degrading)."""
        return self.engine.get_team_integrity_trends(team_id=self.team_id, season=self.season)

    def open_replay(self, *, play_id: str) -> ReplaySessionResponse:
        """Mint a short-lived replay-session token so a report can deep-link to the
        film for a cited play."""
        return issue_replay_token(
            subject=f"play:{play_id}", team_id=str(self.team_id), settings=self.settings
        )
