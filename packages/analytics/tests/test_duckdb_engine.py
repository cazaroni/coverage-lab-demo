from __future__ import annotations

from pathlib import Path
from uuid import UUID

import pytest
import duckdb

from projectedge_analytics import AnalyticsReadNotFoundError, DuckDBAnalyticsEngine


DEV_TEAM_ID = UUID("00000000-0000-0000-0000-000000000001")
RIVAL_TEAM_ID = UUID("00000000-0000-0000-0000-000000000002")


def _write_parquet(query: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    connection = duckdb.connect(database=":memory:")
    connection.execute(f"COPY ({query}) TO '{output_path.as_posix()}' (FORMAT PARQUET)")
    connection.close()


def _seed_lake(lake_root: Path) -> None:
    _write_parquet(
        """
        SELECT *
        FROM (
            VALUES
                ('00000000-0000-0000-0000-000000000001', 'Kansas City Chiefs', 'KC', '2023090700', 2023, 1, '2023-09-07', 'KC', 'DET', 20, 14, 3),
                ('00000000-0000-0000-0000-000000000001', 'Kansas City Chiefs', 'KC', '2023091705', 2023, 2, '2023-09-17', 'JAX', 'KC', 9, 17, 2),
                ('00000000-0000-0000-0000-000000000002', 'Seattle Seahawks', 'SEA', '2023091012', 2023, 1, '2023-09-10', 'SEA', 'LA', 13, 24, 1)
        )
        AS t(team_id, team_name, team_abbr, game_id, season, week, observed_on, home_team_abbr, away_team_abbr, home_score, away_score, play_count)
        """,
        lake_root / "raw" / "nfl_big_data_bowl" / "2023" / "1" / "2023090700" / "games.parquet",
    )
    _write_parquet(
        """
        SELECT *
        FROM (
            VALUES
                ('00000000-0000-0000-0000-000000000001', 'Kansas City Chiefs', 'KC', '2023091705', 2023, 2, '2023-09-17', 'JAX', 'KC', 9, 17, 2)
        )
        AS t(team_id, team_name, team_abbr, game_id, season, week, observed_on, home_team_abbr, away_team_abbr, home_score, away_score, play_count)
        """,
        lake_root / "raw" / "nfl_big_data_bowl" / "2023" / "2" / "2023091705" / "games.parquet",
    )
    _write_parquet(
        """
        SELECT *
        FROM (
            VALUES
                ('00000000-0000-0000-0000-000000000002', 'Seattle Seahawks', 'SEA', '2023091012', 2023, 1, '2023-09-10', 'SEA', 'LA', 13, 24, 1)
        )
        AS t(team_id, team_name, team_abbr, game_id, season, week, observed_on, home_team_abbr, away_team_abbr, home_score, away_score, play_count)
        """,
        lake_root / "raw" / "nfl_big_data_bowl" / "2023" / "1" / "2023091012" / "games.parquet",
    )

    _write_parquet(
        """
        SELECT *
        FROM (
            VALUES
                ('nfl_big_data_bowl', 2023, 1, '2023090700', '2023090700_101', NULL, NULL, '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 101, 'DET', 'KC', 0.30, 0.35, NULL, -2.14, 'I', 'play a', '2023-09-07'),
                ('nfl_big_data_bowl', 2023, 1, '2023090700', '2023090700_461', NULL, NULL, '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 461, 'DET', 'KC', 0.85, 0.19, 21, 1.34, 'C', 'play b', '2023-09-07'),
                ('nfl_big_data_bowl', 2023, 1, '2023090700', '2023090700_530', NULL, NULL, '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 530, 'DET', 'KC', 0.55, 0.22, 18, 0.03, 'C', 'play c', '2023-09-07')
        )
        AS t(source, season, week, game_id, play_id, frame_id, player_id, team_id, model_version, dataset_version, payload_schema_version, raw_play_id, offense_team_abbr, defense_team_abbr, dci, dis, explosive_gain_yards, expected_points_added, pass_result, play_description, game_date_iso)
        """,
        lake_root / "processed" / "plays" / "2023" / "1" / "2023090700" / "plays.parquet",
    )
    _write_parquet(
        """
        SELECT *
        FROM (
            VALUES
                ('nfl_big_data_bowl', 2023, 2, '2023091705', '2023091705_103', NULL, NULL, '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 103, 'JAX', 'KC', 0.42, 0.45, NULL, 1.58, 'C', 'play d', '2023-09-17'),
                ('nfl_big_data_bowl', 2023, 2, '2023091705', '2023091705_2157', NULL, NULL, '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 2157, 'JAX', 'KC', 0.27, 0.05, 26, 1.28, 'C', 'play e', '2023-09-17')
        )
        AS t(source, season, week, game_id, play_id, frame_id, player_id, team_id, model_version, dataset_version, payload_schema_version, raw_play_id, offense_team_abbr, defense_team_abbr, dci, dis, explosive_gain_yards, expected_points_added, pass_result, play_description, game_date_iso)
        """,
        lake_root / "processed" / "plays" / "2023" / "2" / "2023091705" / "plays.parquet",
    )
    _write_parquet(
        """
        SELECT *
        FROM (
            VALUES
                ('nfl_big_data_bowl', 2023, 1, '2023091012', '2023091012_12', NULL, NULL, '00000000-0000-0000-0000-000000000002', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 12, 'SEA', 'LA', 0.66, 0.18, 22, 0.5, 'C', 'rival', '2023-09-10')
        )
        AS t(source, season, week, game_id, play_id, frame_id, player_id, team_id, model_version, dataset_version, payload_schema_version, raw_play_id, offense_team_abbr, defense_team_abbr, dci, dis, explosive_gain_yards, expected_points_added, pass_result, play_description, game_date_iso)
        """,
        lake_root / "processed" / "plays" / "2023" / "1" / "2023091012" / "plays.parquet",
    )

    _write_parquet(
        """
        SELECT *
        FROM (
            VALUES
                ('nfl_big_data_bowl', 2023, 0, 'season', 'season', NULL, '1001', '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 0.70, 10),
                ('nfl_big_data_bowl', 2023, 0, 'season', 'season', NULL, '1002', '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 0.50, 20),
                ('nfl_big_data_bowl', 2023, 0, 'season', 'season', NULL, '2001', '00000000-0000-0000-0000-000000000002', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 0.80, 9)
        )
        AS t(source, season, week, game_id, play_id, frame_id, player_id, team_id, model_version, dataset_version, payload_schema_version, resilience_score, samples)
        """,
        lake_root
        / "processed"
        / "player_stress"
        / "model-v1"
        / "2023"
        / "0"
        / "season"
        / "player_stress.parquet",
    )


@pytest.fixture()
def duckdb_engine(tmp_path) -> DuckDBAnalyticsEngine:
    lake_root = tmp_path / "lake"
    _seed_lake(lake_root)
    return DuckDBAnalyticsEngine(lake_uri=str(lake_root))


def test_duckdb_engine_returns_play_detail(duckdb_engine: DuckDBAnalyticsEngine):
    detail = duckdb_engine.get_play_detail(play_id="2023090700_461", team_id=DEV_TEAM_ID)

    assert detail.play_id == "2023090700_461"
    assert detail.game_id == "2023090700"
    assert detail.team_id == DEV_TEAM_ID
    assert detail.dataset_version == "bigdatabowl-2023-fixture-v1"
    assert detail.model_version == "model-v1"


def test_duckdb_engine_blocks_cross_team_play_access(duckdb_engine: DuckDBAnalyticsEngine):
    with pytest.raises(AnalyticsReadNotFoundError):
        duckdb_engine.get_play_detail(play_id="2023090700_461", team_id=RIVAL_TEAM_ID)


def test_duckdb_engine_returns_stable_dashboard_queries(duckdb_engine: DuckDBAnalyticsEngine):
    distribution = duckdb_engine.get_team_season_dci_distribution(team_id=DEV_TEAM_ID, season=2023)
    explosive = duckdb_engine.search_explosive_plays(team_id=DEV_TEAM_ID, season=2023)
    resilience = duckdb_engine.rank_player_stress_resilience(team_id=DEV_TEAM_ID, season=2023)
    trend = duckdb_engine.get_team_dis_trend(team_id=DEV_TEAM_ID, season=2023)

    assert [(point.bucket, point.count) for point in distribution] == [
        ("0.0-0.2", 0),
        ("0.2-0.4", 2),
        ("0.4-0.6", 2),
        ("0.6-0.8", 0),
        ("0.8-1.0", 1),
    ]
    assert [play.play_id for play in explosive] == [
        "2023091705_2157",
        "2023090700_461",
        "2023090700_530",
    ]
    assert [row.player_id for row in resilience] == ["1001", "1002"]
    assert [point.week for point in trend] == [1, 2]
    assert [point.dis_average for point in trend] == pytest.approx([0.2533333333, 0.25])


def test_duckdb_engine_supports_frontend_bridge_reads(duckdb_engine: DuckDBAnalyticsEngine):
    recent_games = duckdb_engine.list_recent_games(team_id=DEV_TEAM_ID, season=2023, limit=2)
    catalog = duckdb_engine.list_catalog_plays(team_id=DEV_TEAM_ID, season=2023, game_id="2023090700")

    assert [game["game_id"] for game in recent_games] == ["2023091705", "2023090700"]
    assert [play["play_id"] for play in catalog[:2]] == ["2023090700_530", "2023090700_461"]
