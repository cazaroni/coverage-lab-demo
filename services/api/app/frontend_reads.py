from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from uuid import UUID

from app.contracts.analytics import GameSummary, PlayListRow
from projectedge_analytics import (
    AnalyticsEngine,
    AnalyticsReadNotFoundError,
    BigDataBowlAnalyticsEngine,
    DuckDBAnalyticsEngine,
    Phase1BridgeFixture,
    default_phase1_bridge_fixture,
)


@dataclass(slots=True)
class Phase1FrontendReadBridge:
    """Backend-owned bridge that keeps frontend reads deterministic in Phase 1."""

    analytics_engine: AnalyticsEngine
    fixture: Phase1BridgeFixture = field(default_factory=default_phase1_bridge_fixture)

    def list_recent_games(self, *, team_id: UUID, season: int, limit: int = 5) -> list[GameSummary]:
        if isinstance(self.analytics_engine, DuckDBAnalyticsEngine):
            games = self.analytics_engine.list_recent_games(team_id=team_id, season=season, limit=limit)
            return [
                GameSummary(
                    game_id=str(game["game_id"]),
                    season=int(game["season"]),
                    week=int(game["week"]),
                    home_team_abbr=game["home_team_abbr"],
                    away_team_abbr=game["away_team_abbr"],
                    home_score=game["home_score"],
                    away_score=game["away_score"],
                    play_count=int(game["play_count"]),
                )
                for game in games
            ]

        if isinstance(self.analytics_engine, BigDataBowlAnalyticsEngine):
            games = sorted(
                self.analytics_engine.dataset.games_for_team(team_id, season=season),
                key=lambda game: (game.observed_on or date.min, game.game_id),
                reverse=True,
            )
            return [
                GameSummary(
                    game_id=game.game_id,
                    season=game.season,
                    week=game.week,
                    home_team_abbr=game.home_team_abbr,
                    away_team_abbr=game.away_team_abbr,
                    home_score=game.home_score,
                    away_score=game.away_score,
                    play_count=game.play_count,
                )
                for game in games[:limit]
            ]

        games = sorted(
            self.fixture.games_for_team(team_id, season=season),
            key=lambda game: (game.observed_on, game.game_id),
            reverse=True,
        )
        return [
            GameSummary(
                game_id=game.game_id,
                season=game.season,
                week=game.week,
                home_team_abbr=game.home_team_abbr,
                away_team_abbr=game.away_team_abbr,
                home_score=game.home_score,
                away_score=game.away_score,
                play_count=game.play_count,
            )
            for game in games[:limit]
        ]

    def list_catalog_plays(
        self,
        *,
        team_id: UUID,
        season: int,
        game_id: str | None = None,
        week: int | None = None,
        min_dci: float | None = None,
        max_dci: float | None = None,
    ) -> list[PlayListRow]:
        if isinstance(self.analytics_engine, DuckDBAnalyticsEngine):
            plays = self.analytics_engine.list_catalog_plays(
                team_id=team_id,
                season=season,
                game_id=game_id,
                week=week,
                min_dci=min_dci,
                max_dci=max_dci,
            )
            return [
                PlayListRow(
                    play_id=str(play["play_id"]),
                    game_id=str(play["game_id"]),
                    season=int(play["season"]),
                    week=int(play["week"]),
                    dci=play["dci"],
                    dis=play["dis"],
                    offense_team_id=play["offense_team_id"],
                    defense_team_id=play["defense_team_id"],
                    thumbnail_url=play["thumbnail_url"],
                )
                for play in plays
            ]

        if isinstance(self.analytics_engine, BigDataBowlAnalyticsEngine):
            plays = sorted(
                self.analytics_engine.dataset.plays_for_team(team_id, season=season),
                key=lambda play: (play.game_date or date.min, play.game_id, play.raw_play_id),
                reverse=True,
            )
            rows: list[PlayListRow] = []
            for play in plays:
                if game_id is not None and play.game_id != game_id:
                    continue
                if week is not None and play.week != week:
                    continue
                if min_dci is not None and (play.dci is None or play.dci < min_dci):
                    continue
                if max_dci is not None and (play.dci is None or play.dci > max_dci):
                    continue

                rows.append(
                    PlayListRow(
                        play_id=play.play_id,
                        game_id=play.game_id,
                        season=play.season,
                        week=play.week,
                        dci=play.dci,
                        dis=play.dis,
                        offense_team_id=play.offense_team_abbr,
                        defense_team_id=play.defense_team_abbr,
                        thumbnail_url=None,
                    )
                )
            return rows

        visible_games = {
            game.game_id: game for game in self.fixture.games_for_team(team_id, season=season)
        }
        if game_id is not None and game_id not in visible_games:
            return []

        target_game_ids = (
            [game_id]
            if game_id is not None
            else [
                game.game_id
                for game in sorted(
                    visible_games.values(),
                    key=lambda item: (item.observed_on, item.game_id),
                    reverse=True,
                )
            ]
        )
        play_lookup = {
            play.play_id: play for play in self.fixture.plays_for_team(team_id, season=season)
        }

        rows: list[PlayListRow] = []
        for visible_game_id in target_game_ids:
            try:
                summaries = self.analytics_engine.list_game_plays(
                    game_id=visible_game_id,
                    team_id=team_id,
                )
            except AnalyticsReadNotFoundError:
                continue

            for summary in summaries:
                play = play_lookup[summary.play_id]
                if week is not None and play.week != week:
                    continue
                if min_dci is not None and (summary.dci is None or summary.dci < min_dci):
                    continue
                if max_dci is not None and (summary.dci is None or summary.dci > max_dci):
                    continue

                rows.append(
                    PlayListRow(
                        play_id=summary.play_id,
                        game_id=summary.game_id,
                        season=play.season,
                        week=play.week,
                        dci=summary.dci,
                        dis=summary.dis,
                        offense_team_id=play.offense_team_abbr,
                        defense_team_id=play.defense_team_abbr,
                        thumbnail_url=play.thumbnail_url,
                    )
                )

        return rows
