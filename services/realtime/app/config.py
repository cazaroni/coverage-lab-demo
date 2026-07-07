from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PROJECTEDGE_",
        env_file=(".env", ".env.local"),
        extra="ignore",
    )

    service_name: str = "realtime"
    environment: str = "development"
    version: str = "0.1.0"

    # Must match the secret used by services/api
    replay_session_secret: str = Field(
        default="dev-replay-secret-CHANGE-IN-PRODUCTION",
        description="HS256 secret used to verify replay session JWTs issued by services/api.",
    )

    # Analytics backend (mirrors API config so the same fixture loads)
    analytics_backend: str = "bigdatabowl"
    analytics_fixture_dataset_dir: str | None = None

    # Streaming tuning
    chunk_size: int = Field(default=60, ge=1, le=600, description="Frames per WebSocket chunk.")
    log_level: str = "INFO"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
