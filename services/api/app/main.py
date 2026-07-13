from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.analytics_runtime import build_analytics_engine, build_frontend_read_bridge
from app.api.routes import router
from app.config import Settings, get_settings
from app.db import DatabaseSessionManager
from app.metrics import MetricsMiddleware
from app.observability import configure_logging, configure_observability
from app.scoring.cache import build_score_cache, ensure_schema
from app.scoring.inference_client import InferenceClient


_DEV_REPLAY_SECRET = "dev-replay-secret-CHANGE-IN-PRODUCTION"


def _refuse_dev_secret_in_production(settings: Settings) -> None:
    """Fail closed: this secret SIGNS replay JWTs and its dev default is public
    in git — if Render's generateValue ever fails to inject the real value on a
    production host, silently booting would mint forgeable tokens."""
    if settings.replay_session_secret == _DEV_REPLAY_SECRET and (
        os.environ.get("RENDER") or settings.environment == "production"
    ):
        raise RuntimeError(
            "PROJECTEDGE_REPLAY_SESSION_SECRET is still the dev default on a production "
            "host — refusing to start. Check the render.yaml envVars wiring."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings)
    _refuse_dev_secret_in_production(settings)
    app.state.settings = settings
    app.state.db_manager = DatabaseSessionManager(settings.database_url)
    app.state.analytics_engine = build_analytics_engine(settings)
    app.state.frontend_reads = build_frontend_read_bridge(settings, app.state.analytics_engine)
    app.state.inference_client = InferenceClient(
        base_url=settings.inference_base_url,
        model_version=settings.inference_model_version,
        timeout_seconds=settings.inference_timeout_seconds,
    )
    await ensure_schema(app.state.db_manager)
    app.state.score_cache = build_score_cache(app.state.db_manager)
    configure_observability(app, settings)
    yield
    await app.state.inference_client.aclose()
    await app.state.db_manager.dispose()


app = FastAPI(title="ProjectEdge API", version=get_settings().version, lifespan=lifespan)
app.add_middleware(MetricsMiddleware)
app.include_router(router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, RuntimeError):  # preserve FastAPI's runtime error handling shape
        raise exc
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "internal_error",
            "message": "Unhandled API error.",
        },
    )
