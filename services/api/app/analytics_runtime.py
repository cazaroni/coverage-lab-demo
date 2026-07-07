from __future__ import annotations

from app.config import Settings
from app.frontend_reads import Phase1FrontendReadBridge
from projectedge_analytics import (
    AnalyticsEngine,
    BigDataBowlAnalyticsEngine,
    DuckDBAnalyticsEngine,
    FixtureAnalyticsEngine,
)


def build_analytics_engine(settings: Settings) -> AnalyticsEngine:
    if settings.analytics_backend == "duckdb":
        return DuckDBAnalyticsEngine(
            lake_uri=settings.analytics_lake_root,
            httpfs_enabled=settings.analytics_duckdb_httpfs_enabled,
        )

    if settings.analytics_backend == "bigdatabowl":
        return BigDataBowlAnalyticsEngine(dataset_dir=settings.analytics_fixture_dataset_dir)

    if settings.analytics_backend == "fixture":
        return FixtureAnalyticsEngine()

    raise RuntimeError(
        f"Unsupported analytics backend '{settings.analytics_backend}'."
    )


def build_frontend_read_bridge(
    _settings: Settings,
    analytics_engine: AnalyticsEngine,
) -> Phase1FrontendReadBridge:
    return Phase1FrontendReadBridge(analytics_engine=analytics_engine)
