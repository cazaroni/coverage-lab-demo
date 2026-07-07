"""Pandera data-plane validators for ProjectEdge Phase 1 ingestion."""

from __future__ import annotations

import pandas as pd
import pandera as pa
from pandera import Check, Column


play_metadata_schema = pa.DataFrameSchema(
    {
        "source": Column(pa.String, nullable=False),
        "season": Column(pa.Int64, nullable=False, checks=[Check.ge(2000), Check.le(2100)]),
        "week": Column(pa.Int64, nullable=False, checks=[Check.ge(0), Check.le(30)]),
        "game_id": Column(pa.String, nullable=False),
        "play_id": Column(pa.String, nullable=False),
        "frame_id": Column(pa.Float64, nullable=True),
        "player_id": Column(pa.String, nullable=True),
        "team_id": Column(pa.String, nullable=False),
        "model_version": Column(pa.String, nullable=False),
        "dataset_version": Column(pa.String, nullable=False),
        "payload_schema_version": Column(pa.String, nullable=False),
        "raw_play_id": Column(pa.Int64, nullable=False),
        "offense_team_abbr": Column(pa.String, nullable=True),
        "defense_team_abbr": Column(pa.String, nullable=True),
        "dci": Column(pa.Float64, nullable=True, checks=[Check.ge(0), Check.le(1)]),
        "dis": Column(pa.Float64, nullable=True, checks=[Check.ge(0), Check.le(1)]),
        "explosive_gain_yards": Column(pa.Float64, nullable=True),
        "expected_points_added": Column(pa.Float64, nullable=True),
        "pass_result": Column(pa.String, nullable=True),
        "play_description": Column(pa.String, nullable=True),
        "game_date_iso": Column(pa.String, nullable=True),
    },
    unique=["team_id", "game_id", "play_id"],
    coerce=True,
    strict=False,
)


tracking_frame_schema = pa.DataFrameSchema(
    {
        "source": Column(pa.String, nullable=False),
        "season": Column(pa.Int64, nullable=False, checks=[Check.ge(2000), Check.le(2100)]),
        "week": Column(pa.Int64, nullable=False, checks=[Check.ge(0), Check.le(30)]),
        "game_id": Column(pa.String, nullable=False),
        "play_id": Column(pa.String, nullable=False),
        "frame_id": Column(pa.Int64, nullable=False, checks=[Check.ge(1)]),
        "player_id": Column(pa.String, nullable=False),
        "team_id": Column(pa.String, nullable=False),
        "model_version": Column(pa.String, nullable=False),
        "dataset_version": Column(pa.String, nullable=False),
        "payload_schema_version": Column(pa.String, nullable=False),
        "x": Column(pa.Float64, nullable=False),
        "y": Column(pa.Float64, nullable=False),
        "node_stress": Column(pa.Float64, nullable=False, checks=[Check.ge(0)]),
        "frame_dci": Column(pa.Float64, nullable=False, checks=[Check.ge(0), Check.le(1)]),
        "frame_dis": Column(pa.Float64, nullable=False, checks=[Check.ge(0), Check.le(1)]),
        "player_label": Column(pa.String, nullable=False),
        "player_position": Column(pa.String, nullable=True),
        "player_side": Column(pa.String, nullable=True),
    },
    unique=["team_id", "game_id", "play_id", "frame_id", "player_id"],
    coerce=True,
    strict=False,
)


embedding_schema = pa.DataFrameSchema(
    {
        "source": Column(pa.String, nullable=False),
        "season": Column(pa.Int64, nullable=False, checks=[Check.ge(2000), Check.le(2100)]),
        "week": Column(pa.Int64, nullable=False, checks=[Check.ge(0), Check.le(30)]),
        "game_id": Column(pa.String, nullable=False),
        "play_id": Column(pa.String, nullable=False),
        "frame_id": Column(pa.Float64, nullable=True),
        "player_id": Column(pa.String, nullable=True),
        "team_id": Column(pa.String, nullable=False),
        "model_version": Column(pa.String, nullable=False),
        "dataset_version": Column(pa.String, nullable=False),
        "payload_schema_version": Column(pa.String, nullable=False),
        "embedding_dim": Column(pa.Int64, nullable=False, checks=[Check.ge(1)]),
        "embedding_0": Column(pa.Float64, nullable=False),
        "embedding_1": Column(pa.Float64, nullable=False),
    },
    unique=["team_id", "game_id", "play_id"],
    coerce=True,
    strict=False,
)


def validate_play_metadata_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Validate play metadata rows before writing processed plays."""

    return play_metadata_schema.validate(frame, lazy=True)


def validate_tracking_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Validate tracking frame rows before writing processed tracking outputs."""

    return tracking_frame_schema.validate(frame, lazy=True)


def validate_embedding_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Validate embedding rows before writing embedding outputs."""

    return embedding_schema.validate(frame, lazy=True)
