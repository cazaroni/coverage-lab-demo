from __future__ import annotations

import json

import pandas as pd

from projectedge_schemas import (
    DatasetManifest,
    REQUIRED_JOIN_KEYS,
    backfill_season,
    ingest_game,
)


def test_backfill_season_writes_parquet_and_manifests(tmp_path):
    lake_root = tmp_path / "lake"

    summary = backfill_season(season=2023, lake_root=lake_root)

    assert summary.ingested_games == 34
    assert summary.lake_root == lake_root
    assert len(summary.manifest_paths) >= 35

    plays_path = lake_root / "processed" / "plays" / "2023" / "1" / "2023090700" / "plays.parquet"
    assert plays_path.exists()

    plays_frame = pd.read_parquet(plays_path)
    for key in REQUIRED_JOIN_KEYS:
        assert key in plays_frame.columns

    manifest_dir = lake_root / "manifests" / "processed_plays"
    manifest_paths = sorted(manifest_dir.glob("*.json"))
    assert manifest_paths

    manifest_document = json.loads(manifest_paths[0].read_text(encoding="utf-8"))
    manifest = DatasetManifest.model_validate(manifest_document)
    assert manifest.dataset == "processed_plays"
    assert manifest.season == 2023


def test_ingest_game_is_idempotent_for_target_paths(tmp_path):
    lake_root = tmp_path / "lake"

    first_run = ingest_game(game_id="2023090700", season=2023, lake_root=lake_root)
    second_run = ingest_game(game_id="2023090700", season=2023, lake_root=lake_root)

    assert first_run.game_id == second_run.game_id == "2023090700"
    assert first_run.week == second_run.week == 1

    parquet_paths = sorted(lake_root.rglob("*.parquet"))
    assert len(parquet_paths) == 4

    assert set(first_run.manifest_paths) == set(second_run.manifest_paths)
