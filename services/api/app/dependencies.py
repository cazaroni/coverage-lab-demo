from __future__ import annotations

from fastapi import Request

from app.config import Settings, get_settings
from app.db import DatabaseSessionManager
from app.frontend_reads import Phase1FrontendReadBridge
from app.scoring.cache import ScoreCache
from app.scoring.inference_client import InferenceClient
from projectedge_analytics import AnalyticsEngine


def get_runtime_settings() -> Settings:
    return get_settings()


def get_db_manager(request: Request) -> DatabaseSessionManager:
    return request.app.state.db_manager


def get_analytics_engine(request: Request) -> AnalyticsEngine:
    return request.app.state.analytics_engine


def get_frontend_read_bridge(request: Request) -> Phase1FrontendReadBridge:
    return request.app.state.frontend_reads


def get_inference_client(request: Request) -> InferenceClient:
    return request.app.state.inference_client


def get_score_cache(request: Request) -> ScoreCache:
    return request.app.state.score_cache
