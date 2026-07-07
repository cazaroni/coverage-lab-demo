from __future__ import annotations

import os
from pathlib import Path

import duckdb
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


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
                ('00000000-0000-0000-0000-000000000001', 'Kansas City Chiefs', 'KC', '2023090700', 2023, 1, '2023-09-07', 'KC', 'DET', 20, 14, 2)
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
                ('nfl_big_data_bowl', 2023, 1, '2023090700', '2023090700_101', NULL, NULL, '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 101, 'DET', 'KC', 0.30, 0.35, NULL, -2.14, 'I', 'play a', '2023-09-07'),
                ('nfl_big_data_bowl', 2023, 1, '2023090700', '2023090700_461', NULL, NULL, '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 461, 'DET', 'KC', 0.85, 0.19, 21, 1.34, 'C', 'play b', '2023-09-07')
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
                ('nfl_big_data_bowl', 2023, 0, 'season', 'season', NULL, '1001', '00000000-0000-0000-0000-000000000001', 'model-v1', 'bigdatabowl-2023-fixture-v1', '0.0.1', 0.70, 10)
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


def test_routes_serve_duckdb_backed_reads(tmp_path):
    lake_root = tmp_path / "lake"
    _seed_lake(lake_root)

    previous_backend = os.environ.get("PROJECTEDGE_ANALYTICS_BACKEND")
    previous_lake = os.environ.get("PROJECTEDGE_ANALYTICS_LAKE_ROOT")

    os.environ["PROJECTEDGE_ANALYTICS_BACKEND"] = "duckdb"
    os.environ["PROJECTEDGE_ANALYTICS_LAKE_ROOT"] = str(lake_root)
    get_settings.cache_clear()

    try:
        with TestClient(app) as client:
            games_response = client.get("/games")
            catalog_response = client.get("/catalog/plays")

        assert games_response.status_code == 200
        assert [game["game_id"] for game in games_response.json()] == ["2023090700"]

        assert catalog_response.status_code == 200
        assert [play["play_id"] for play in catalog_response.json()] == [
            "2023090700_461",
            "2023090700_101",
        ]
    finally:
        if previous_backend is None:
            os.environ.pop("PROJECTEDGE_ANALYTICS_BACKEND", None)
        else:
            os.environ["PROJECTEDGE_ANALYTICS_BACKEND"] = previous_backend

        if previous_lake is None:
            os.environ.pop("PROJECTEDGE_ANALYTICS_LAKE_ROOT", None)
        else:
            os.environ["PROJECTEDGE_ANALYTICS_LAKE_ROOT"] = previous_lake

        get_settings.cache_clear()
