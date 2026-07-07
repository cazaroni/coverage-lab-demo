"""Canonical ProjectEdge lake prefixes for MinIO bootstrap."""

from __future__ import annotations

from typing import Final

CANONICAL_PREFIX_TEMPLATES: Final[dict[str, str]] = {
    "raw": "raw/{source}/{season}/{week}/{game_id}/*.parquet",
    "processed_tracking": "processed/tracking/{season}/{week}/{game_id}/*.parquet",
    "processed_plays": "processed/plays/{season}/{week}/{game_id}/*.parquet",
    "processed_scores": "processed/scores/{model_version}/{season}/{week}/{game_id}/*.parquet",
    "processed_player_stress": "processed/player_stress/{model_version}/{season}/{week}/{game_id}/*.parquet",
    "embeddings": "embeddings/{model_version}/{season}/*.parquet",
    "models": "models/{model_version}/{weights,centroids,calibrator,manifest.json}",
    "reports": "reports/{team_id}/{year}/{report_id}.json",
    "manifests": "manifests/{dataset}/{dataset_version}.json",
}

# Marker object prefixes written during bootstrap.
CANONICAL_PREFIX_MARKERS: Final[tuple[str, ...]] = (
    "raw/",
    "processed/tracking/",
    "processed/plays/",
    "processed/scores/",
    "processed/player_stress/",
    "embeddings/",
    "models/",
    "reports/",
    "manifests/",
)
