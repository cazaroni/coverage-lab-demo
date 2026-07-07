from __future__ import annotations

from functools import lru_cache
from typing import Literal
from uuid import UUID

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PROJECTEDGE_",
        env_file=(".env", ".env.local"),
        extra="ignore",
    )

    service_name: str = "api"
    environment: str = "development"
    version: str = "0.1.0"

    auth_mode: Literal["development", "clerk"] = "development"
    clerk_jwt_issuer: str | None = None
    clerk_jwt_audience: str | None = None
    clerk_jwt_public_key: str | None = None
    clerk_user_id_claim: str = "sub"
    clerk_active_team_claim: str = "active_team_id"
    clerk_role_claim: str = "role"
    clerk_session_id_claim: str = "sid"
    clerk_memberships_claim: str = "memberships"

    development_user_id: str = "user_dev_001"
    development_team_id: UUID = UUID("00000000-0000-0000-0000-000000000001")
    development_role: str = "coach"
    development_session_id: str = "dev-session-001"
    development_team_name: str = "Kansas City Chiefs"
    development_auto_auth: bool = True
    development_team_aliases: tuple[str, ...] = ("team_springfield_arrows",)

    analytics_backend: Literal["fixture", "bigdatabowl", "duckdb"] = "bigdatabowl"
    analytics_default_season: int = Field(default=2023, ge=2000, le=2100)
    analytics_fixture_dataset_dir: str | None = None
    analytics_lake_root: str | None = None
    analytics_duckdb_httpfs_enabled: bool = False

    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "PROJECTEDGE_DATABASE_URL"),
    )

    otel_enabled: bool = True
    otel_service_name: str = "projectedge-api"
    otel_exporter_otlp_endpoint: str | None = None

    metrics_enabled: bool = True
    log_level: str = "INFO"

    request_timeout_seconds: float = Field(default=5.0, gt=0)

    # Inference scoring. When inference_base_url is unset the API scores in-process
    # (deterministic geometric fallback) so dev/tests run without the service.
    inference_base_url: str | None = None
    inference_timeout_seconds: float = Field(default=5.0, gt=0)
    inference_model_version: str = "geom-fake-v1"
    inference_payload_schema_version: str = "v1"

    replay_session_secret: str = Field(
        default="dev-replay-secret-CHANGE-IN-PRODUCTION",
        description="HS256 secret used to sign replay session JWTs.",
    )
    replay_session_ttl_seconds: int = Field(
        default=300,
        ge=30,
        le=3600,
        description="Replay session JWT lifetime in seconds (default 5 min).",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
