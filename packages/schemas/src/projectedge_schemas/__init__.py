"""Shared data contracts for ProjectEdge Phase 0."""

from .ingestion_flows import (
    GameIngestArtifacts,
    SeasonIngestSummary,
    backfill_season,
    default_curated_fixture_dir,
    default_lake_root,
    ingest_game,
)
from .join_keys import REQUIRED_JOIN_KEYS
from .lake_paths import CANONICAL_PREFIX_TEMPLATES
from .manifest_models import DatasetManifest, ManifestProvenance
from .pandera_schemas import (
    embedding_schema,
    play_metadata_schema,
    tracking_frame_schema,
    validate_embedding_frame,
    validate_play_metadata_frame,
    validate_tracking_frame,
)
from .play_embedding import play_embedding
from .play_metadata import play_metadata
from .play_score_summary import play_score_summary
from .player_stress_summary import player_stress_summary
from .schema_registry import REQUIRED_SCHEMA_NAMES, SchemaPlaceholder, SchemaRegistry
from .tracking_frame import tracking_frame

__all__ = [
    "CANONICAL_PREFIX_TEMPLATES",
    "DatasetManifest",
    "GameIngestArtifacts",
    "ManifestProvenance",
    "SeasonIngestSummary",
    "backfill_season",
    "default_curated_fixture_dir",
    "default_lake_root",
    "embedding_schema",
    "ingest_game",
    "play_embedding",
    "play_metadata_schema",
    "play_metadata",
    "play_score_summary",
    "player_stress_summary",
    "REQUIRED_JOIN_KEYS",
    "REQUIRED_SCHEMA_NAMES",
    "SchemaPlaceholder",
    "SchemaRegistry",
    "tracking_frame",
    "tracking_frame_schema",
    "validate_embedding_frame",
    "validate_play_metadata_frame",
    "validate_tracking_frame",
]
