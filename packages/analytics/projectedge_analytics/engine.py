from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from statistics import mean
from typing import Protocol
from uuid import UUID

import duckdb

from ._bridge_fixture import Phase1BridgeFixture, default_phase1_bridge_fixture
from .errors import AnalyticsReadNotFoundError
from .models import (
    ExplosivePlayMatch,
    GamePlaySummary,
    PlayDetail,
    PlayForensics,
    PlayerStressResilienceRow,
    TeamDCIDistributionPoint,
    TeamDISTrendPoint,
    TeamIntegrityPoint,
)


class AnalyticsEngine(Protocol):
    """Stable backend/intelligence OLAP abstraction for ProjectEdge."""

    engine_name: str

    def get_play_detail(self, *, play_id: str, team_id: UUID) -> PlayDetail: ...

    def list_game_plays(self, *, game_id: str, team_id: UUID) -> list[GamePlaySummary]: ...

    def get_team_season_dci_distribution(
        self, *, team_id: UUID, season: int
    ) -> list[TeamDCIDistributionPoint]: ...

    def search_explosive_plays(self, *, team_id: UUID, season: int) -> list[ExplosivePlayMatch]: ...

    def rank_player_stress_resilience(
        self, *, team_id: UUID, season: int
    ) -> list[PlayerStressResilienceRow]: ...

    def get_team_dis_trend(self, *, team_id: UUID, season: int) -> list[TeamDISTrendPoint]: ...

    def get_play_forensics(self, *, play_id: str, team_id: UUID) -> PlayForensics: ...

    def get_team_integrity_trends(self, *, team_id: UUID, season: int) -> list[TeamIntegrityPoint]: ...


@dataclass(slots=True)
class FixtureAnalyticsEngine:
    """Phase 1 bridge backed by deterministic fixtures until the DuckDB lake plane lands."""

    fixture: Phase1BridgeFixture = field(default_factory=default_phase1_bridge_fixture)
    engine_name: str = "fixture-bridge"

    def _play_records(self, *, team_id: UUID, season: int | None = None):
        return self.fixture.plays_for_team(team_id, season=season)

    def _game_records(self, *, team_id: UUID, season: int | None = None):
        return self.fixture.games_for_team(team_id, season=season)

    def _find_play(self, *, play_id: str, team_id: UUID):
        for play in self._play_records(team_id=team_id):
            if play.play_id == play_id:
                return play
        raise AnalyticsReadNotFoundError(f"Play '{play_id}' was not found for the active team.")

    def get_play_detail(self, *, play_id: str, team_id: UUID) -> PlayDetail:
        play = self._find_play(play_id=play_id, team_id=team_id)
        return PlayDetail(
            play_id=play.play_id,
            game_id=play.game_id,
            team_id=play.team_id,
            season=play.season,
            week=play.week,
            dci=play.dci,
            dis=play.dis,
            dataset_version=play.dataset_version,
            model_version=play.model_version,
        )

    def list_game_plays(self, *, game_id: str, team_id: UUID) -> list[GamePlaySummary]:
        plays = [play for play in self._play_records(team_id=team_id) if play.game_id == game_id]
        if not plays:
            raise AnalyticsReadNotFoundError(f"Game '{game_id}' was not found for the active team.")

        plays.sort(key=lambda play: play.sequence)
        return [
            GamePlaySummary(
                play_id=play.play_id,
                game_id=play.game_id,
                offense_team_id=play.offense_team_id,
                defense_team_id=play.defense_team_id,
                dci=play.dci,
                dis=play.dis,
            )
            for play in plays
        ]

    def get_team_season_dci_distribution(
        self, *, team_id: UUID, season: int
    ) -> list[TeamDCIDistributionPoint]:
        counts = {
            "0.0-0.2": 0,
            "0.2-0.4": 0,
            "0.4-0.6": 0,
            "0.6-0.8": 0,
            "0.8-1.0": 0,
        }

        for play in self._play_records(team_id=team_id, season=season):
            if play.dci is None:
                continue
            if play.dci < 0.2:
                counts["0.0-0.2"] += 1
            elif play.dci < 0.4:
                counts["0.2-0.4"] += 1
            elif play.dci < 0.6:
                counts["0.4-0.6"] += 1
            elif play.dci < 0.8:
                counts["0.6-0.8"] += 1
            else:
                counts["0.8-1.0"] += 1

        return [
            TeamDCIDistributionPoint(bucket=bucket, count=count)
            for bucket, count in counts.items()
        ]

    def search_explosive_plays(self, *, team_id: UUID, season: int) -> list[ExplosivePlayMatch]:
        matches = [
            play
            for play in self._play_records(team_id=team_id, season=season)
            if play.dis is not None and play.dis < 0.25 and play.explosive_gain_yards is not None
        ]
        matches.sort(
            key=lambda play: (
                -(play.explosive_gain_yards or 0),
                play.play_id,
            )
        )
        return [
            ExplosivePlayMatch(
                play_id=play.play_id,
                game_id=play.game_id,
                preceding_dis=play.dis or 0.0,
                explosive_gain_yards=play.explosive_gain_yards,
            )
            for play in matches
        ]

    def rank_player_stress_resilience(
        self, *, team_id: UUID, season: int
    ) -> list[PlayerStressResilienceRow]:
        rows = list(self.fixture.resilience_for_team(team_id=team_id, season=season))
        rows.sort(key=lambda row: (-row.resilience_score, -row.samples, row.player_id))
        return [
            PlayerStressResilienceRow(
                player_id=row.player_id,
                team_id=row.team_id,
                resilience_score=row.resilience_score,
                samples=row.samples,
            )
            for row in rows
        ]

    def get_team_dis_trend(self, *, team_id: UUID, season: int) -> list[TeamDISTrendPoint]:
        games_by_week = {
            game.week: game for game in self._game_records(team_id=team_id, season=season)
        }
        dis_by_week: dict[int, list[float]] = {}
        for play in self._play_records(team_id=team_id, season=season):
            if play.dis is None:
                continue
            dis_by_week.setdefault(play.week, []).append(play.dis)

        return [
            TeamDISTrendPoint(
                team_id=team_id,
                week=week,
                observed_on=games_by_week.get(week).observed_on if week in games_by_week else None,
                dis_average=mean(values),
            )
            for week, values in sorted(dis_by_week.items())
        ]

    def get_play_forensics(self, *, play_id: str, team_id: UUID) -> PlayForensics:
        raise NotImplementedError("FixtureAnalyticsEngine does not support forensics; use BigDataBowlAnalyticsEngine")

    def get_team_integrity_trends(self, *, team_id: UUID, season: int) -> list[TeamIntegrityPoint]:
        raise NotImplementedError("FixtureAnalyticsEngine does not support integrity trends; use BigDataBowlAnalyticsEngine")


@dataclass(slots=True)
class DuckDBAnalyticsEngine:
    """DuckDB-backed read plane over canonical lake Parquet outputs."""

    lake_uri: str | None = None
    httpfs_enabled: bool = False
    engine_name: str = "duckdb"

    @staticmethod
    def _default_lake_root() -> Path:
        return Path(__file__).resolve().parents[3] / "packages" / "schemas" / "fixtures" / "lake"

    def _lake_root(self) -> Path:
        return Path(self.lake_uri).resolve() if self.lake_uri is not None else self._default_lake_root()

    def _plays_glob(self) -> str:
        return (
            self._lake_root()
            / "processed"
            / "plays"
            / "*"
            / "*"
            / "*"
            / "*.parquet"
        ).as_posix()

    def _games_glob(self) -> str:
        return (
            self._lake_root()
            / "raw"
            / "*"
            / "*"
            / "*"
            / "*"
            / "games.parquet"
        ).as_posix()

    def _player_stress_glob(self) -> str:
        return (
            self._lake_root()
            / "processed"
            / "player_stress"
            / "*"
            / "*"
            / "*"
            / "*"
            / "*.parquet"
        ).as_posix()

    def _connect(self) -> duckdb.DuckDBPyConnection:
        connection = duckdb.connect(database=":memory:")
        if self.httpfs_enabled:
            connection.execute("INSTALL httpfs")
            connection.execute("LOAD httpfs")
        return connection

    @staticmethod
    def _is_missing_data_error(exc: duckdb.Error) -> bool:
        message = str(exc).lower()
        return "no files found that match the pattern" in message or "no such file" in message

    def get_play_detail(self, *, play_id: str, team_id: UUID) -> PlayDetail:
        query = """
            SELECT
                play_id,
                game_id,
                team_id,
                season,
                week,
                dci,
                dis,
                dataset_version,
                model_version
            FROM read_parquet(?, union_by_name=true)
            WHERE play_id = ? AND team_id = ?
            LIMIT 1
        """

        try:
            with self._connect() as connection:
                row = connection.execute(
                    query,
                    [self._plays_glob(), play_id, str(team_id)],
                ).fetchone()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                raise AnalyticsReadNotFoundError(
                    f"Play '{play_id}' was not found for the active team."
                ) from exc
            raise

        if row is None:
            raise AnalyticsReadNotFoundError(f"Play '{play_id}' was not found for the active team.")

        return PlayDetail(
            play_id=row[0],
            game_id=row[1],
            team_id=row[2],
            season=row[3],
            week=row[4],
            dci=row[5],
            dis=row[6],
            dataset_version=row[7],
            model_version=row[8],
        )

    def list_game_plays(self, *, game_id: str, team_id: UUID) -> list[GamePlaySummary]:
        query = """
            SELECT
                play_id,
                game_id,
                offense_team_abbr,
                defense_team_abbr,
                dci,
                dis
            FROM read_parquet(?, union_by_name=true)
            WHERE game_id = ? AND team_id = ?
            ORDER BY raw_play_id ASC
        """

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    query,
                    [self._plays_glob(), game_id, str(team_id)],
                ).fetchall()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                raise AnalyticsReadNotFoundError(
                    f"Game '{game_id}' was not found for the active team."
                ) from exc
            raise

        if not rows:
            raise AnalyticsReadNotFoundError(f"Game '{game_id}' was not found for the active team.")

        return [
            GamePlaySummary(
                play_id=row[0],
                game_id=row[1],
                offense_team_id=row[2],
                defense_team_id=row[3],
                dci=row[4],
                dis=row[5],
            )
            for row in rows
        ]

    def get_team_season_dci_distribution(
        self, *, team_id: UUID, season: int
    ) -> list[TeamDCIDistributionPoint]:
        query = """
            SELECT
                CASE
                    WHEN dci < 0.2 THEN '0.0-0.2'
                    WHEN dci < 0.4 THEN '0.2-0.4'
                    WHEN dci < 0.6 THEN '0.4-0.6'
                    WHEN dci < 0.8 THEN '0.6-0.8'
                    ELSE '0.8-1.0'
                END AS bucket,
                COUNT(*) AS count
            FROM read_parquet(?, union_by_name=true)
            WHERE team_id = ? AND season = ? AND dci IS NOT NULL
            GROUP BY bucket
        """

        counts = {
            "0.0-0.2": 0,
            "0.2-0.4": 0,
            "0.4-0.6": 0,
            "0.6-0.8": 0,
            "0.8-1.0": 0,
        }

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    query,
                    [self._plays_glob(), str(team_id), season],
                ).fetchall()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                rows = []
            else:
                raise

        for bucket, count in rows:
            counts[str(bucket)] = int(count)

        return [
            TeamDCIDistributionPoint(bucket=bucket, count=count)
            for bucket, count in counts.items()
        ]

    def search_explosive_plays(self, *, team_id: UUID, season: int) -> list[ExplosivePlayMatch]:
        query = """
            SELECT
                play_id,
                game_id,
                dis AS preceding_dis,
                explosive_gain_yards
            FROM read_parquet(?, union_by_name=true)
            WHERE team_id = ?
              AND season = ?
              AND dis IS NOT NULL
              AND dis < 0.25
              AND explosive_gain_yards IS NOT NULL
            ORDER BY explosive_gain_yards DESC, play_id ASC
        """

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    query,
                    [self._plays_glob(), str(team_id), season],
                ).fetchall()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                return []
            raise

        return [
            ExplosivePlayMatch(
                play_id=row[0],
                game_id=row[1],
                preceding_dis=row[2],
                explosive_gain_yards=row[3],
            )
            for row in rows
        ]

    def rank_player_stress_resilience(
        self, *, team_id: UUID, season: int
    ) -> list[PlayerStressResilienceRow]:
        query = """
            SELECT
                player_id,
                team_id,
                resilience_score,
                samples
            FROM read_parquet(?, union_by_name=true)
            WHERE team_id = ? AND season = ?
            ORDER BY resilience_score DESC, samples DESC, player_id ASC
        """

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    query,
                    [self._player_stress_glob(), str(team_id), season],
                ).fetchall()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                return []
            raise

        return [
            PlayerStressResilienceRow(
                player_id=row[0],
                team_id=row[1],
                resilience_score=row[2],
                samples=row[3],
            )
            for row in rows
        ]

    def get_team_dis_trend(self, *, team_id: UUID, season: int) -> list[TeamDISTrendPoint]:
        query = """
            WITH dis_by_week AS (
                SELECT
                    week,
                    AVG(dis) AS dis_average
                FROM read_parquet(?, union_by_name=true)
                WHERE team_id = ? AND season = ? AND dis IS NOT NULL
                GROUP BY week
            ),
            games_by_week AS (
                SELECT
                    week,
                    MAX(observed_on) AS observed_on
                FROM read_parquet(?, union_by_name=true)
                WHERE team_id = ? AND season = ?
                GROUP BY week
            )
            SELECT
                dis_by_week.week,
                games_by_week.observed_on,
                dis_by_week.dis_average
            FROM dis_by_week
            LEFT JOIN games_by_week
                ON dis_by_week.week = games_by_week.week
            ORDER BY dis_by_week.week ASC
        """

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    query,
                    [
                        self._plays_glob(),
                        str(team_id),
                        season,
                        self._games_glob(),
                        str(team_id),
                        season,
                    ],
                ).fetchall()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                return []
            raise

        trend: list[TeamDISTrendPoint] = []
        for week, observed_on, dis_average in rows:
            parsed_observed_on: date | None = None
            if isinstance(observed_on, date):
                parsed_observed_on = observed_on
            elif isinstance(observed_on, str) and observed_on:
                parsed_observed_on = date.fromisoformat(observed_on)

            trend.append(
                TeamDISTrendPoint(
                    team_id=team_id,
                    week=week,
                    observed_on=parsed_observed_on,
                    dis_average=dis_average,
                )
            )
        return trend

    def get_play_forensics(self, *, play_id: str, team_id: UUID) -> PlayForensics:
        raise NotImplementedError("DuckDBAnalyticsEngine.get_play_forensics is not yet implemented")

    def get_team_integrity_trends(self, *, team_id: UUID, season: int) -> list[TeamIntegrityPoint]:
        raise NotImplementedError("DuckDBAnalyticsEngine.get_team_integrity_trends is not yet implemented")

    def list_recent_games(self, *, team_id: UUID, season: int, limit: int = 5) -> list[dict[str, object]]:
        query = """
            WITH ranked_games AS (
                SELECT
                    game_id,
                    season,
                    week,
                    home_team_abbr,
                    away_team_abbr,
                    home_score,
                    away_score,
                    play_count,
                    observed_on,
                    ROW_NUMBER() OVER (
                        PARTITION BY game_id
                        ORDER BY observed_on DESC NULLS LAST
                    ) AS row_rank
                FROM read_parquet(?, union_by_name=true)
                WHERE team_id = ? AND season = ?
            )
            SELECT
                game_id,
                season,
                week,
                home_team_abbr,
                away_team_abbr,
                home_score,
                away_score,
                play_count
            FROM ranked_games
            WHERE row_rank = 1
            ORDER BY observed_on DESC NULLS LAST, game_id DESC
            LIMIT ?
        """

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    query,
                    [self._games_glob(), str(team_id), season, limit],
                ).fetchall()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                return []
            raise

        return [
            {
                "game_id": row[0],
                "season": row[1],
                "week": row[2],
                "home_team_abbr": row[3],
                "away_team_abbr": row[4],
                "home_score": row[5],
                "away_score": row[6],
                "play_count": row[7],
            }
            for row in rows
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
    ) -> list[dict[str, object]]:
        conditions = ["team_id = ?", "season = ?"]
        parameters: list[object] = [self._plays_glob(), str(team_id), season]

        if game_id is not None:
            conditions.append("game_id = ?")
            parameters.append(game_id)
        if week is not None:
            conditions.append("week = ?")
            parameters.append(week)
        if min_dci is not None:
            conditions.append("dci IS NOT NULL AND dci >= ?")
            parameters.append(min_dci)
        if max_dci is not None:
            conditions.append("dci IS NOT NULL AND dci <= ?")
            parameters.append(max_dci)

        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT
                play_id,
                game_id,
                season,
                week,
                dci,
                dis,
                offense_team_abbr,
                defense_team_abbr,
                NULL AS thumbnail_url
            FROM read_parquet(?, union_by_name=true)
            WHERE {where_clause}
            ORDER BY game_date_iso DESC NULLS LAST, game_id DESC, raw_play_id DESC
        """

        try:
            with self._connect() as connection:
                rows = connection.execute(query, parameters).fetchall()
        except duckdb.Error as exc:
            if self._is_missing_data_error(exc):
                return []
            raise

        return [
            {
                "play_id": row[0],
                "game_id": row[1],
                "season": row[2],
                "week": row[3],
                "dci": row[4],
                "dis": row[5],
                "offense_team_id": row[6],
                "defense_team_id": row[7],
                "thumbnail_url": row[8],
            }
            for row in rows
        ]


@dataclass(slots=True)
class ClickHouseAnalyticsEngine:
    """Scale-path stub that preserves the public interface from Phase 0 onward."""

    cluster_dsn: str | None = None
    engine_name: str = "clickhouse"
    unsupported_reason: str = field(
        default="ClickHouse stays out of the Phase 0 runtime until the documented scale trigger opens."
    )

    def get_play_detail(self, *, play_id: str, team_id: UUID) -> PlayDetail:
        raise NotImplementedError(self.unsupported_reason)

    def list_game_plays(self, *, game_id: str, team_id: UUID) -> list[GamePlaySummary]:
        raise NotImplementedError(self.unsupported_reason)

    def get_team_season_dci_distribution(
        self, *, team_id: UUID, season: int
    ) -> list[TeamDCIDistributionPoint]:
        raise NotImplementedError(self.unsupported_reason)

    def search_explosive_plays(self, *, team_id: UUID, season: int) -> list[ExplosivePlayMatch]:
        raise NotImplementedError(self.unsupported_reason)

    def rank_player_stress_resilience(
        self, *, team_id: UUID, season: int
    ) -> list[PlayerStressResilienceRow]:
        raise NotImplementedError(self.unsupported_reason)

    def get_team_dis_trend(self, *, team_id: UUID, season: int) -> list[TeamDISTrendPoint]:
        raise NotImplementedError(self.unsupported_reason)

    def get_play_forensics(self, *, play_id: str, team_id: UUID) -> PlayForensics:
        raise NotImplementedError(self.unsupported_reason)

    def get_team_integrity_trends(self, *, team_id: UUID, season: int) -> list[TeamIntegrityPoint]:
        raise NotImplementedError(self.unsupported_reason)
