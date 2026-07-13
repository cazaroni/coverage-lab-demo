from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect

from .config import Settings, get_settings
from .streamer import WS_MSG_ERROR, encode_ws_message, stream_drive_frames, stream_play_frames
from .token import ReplayTokenError, verify_replay_token

logger = logging.getLogger(__name__)

_DEV_REPLAY_SECRET = "dev-replay-secret-CHANGE-IN-PRODUCTION"


def _refuse_dev_secret_in_production(secret: str, environment: str) -> None:
    """Fail closed: this secret VERIFIES replay JWTs, and its dev default is
    public in git — if the render.yaml fromService wiring ever fails to inject
    the real value on a production host, silently booting would accept
    attacker-forged tokens."""
    if secret == _DEV_REPLAY_SECRET and (os.environ.get("RENDER") or environment == "production"):
        raise RuntimeError(
            "PROJECTEDGE_REPLAY_SESSION_SECRET is still the dev default on a production "
            "host — refusing to start. Check the render.yaml fromService wiring."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
    _refuse_dev_secret_in_production(settings.replay_session_secret, settings.environment)

    from projectedge_analytics import BigDataBowlAnalyticsEngine
    engine = BigDataBowlAnalyticsEngine(dataset_dir=settings.analytics_fixture_dataset_dir)
    app.state.engine = engine
    app.state.settings = settings
    yield


app = FastAPI(
    title="ProjectEdge Realtime",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/healthz", tags=["platform"])
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "realtime"}


@app.websocket("/ws/replay")
async def ws_replay(
    websocket: WebSocket,
    token: str = Query(..., description="Signed replay session JWT from POST /replay-session"),
) -> None:
    settings: Settings = websocket.app.state.settings

    try:
        claims = verify_replay_token(token, settings.replay_session_secret)
    except ReplayTokenError as exc:
        logger.warning("Replay websocket rejected before accept: %s", exc)
        await websocket.close(code=4001, reason=str(exc))
        return

    await websocket.accept()

    from projectedge_analytics import BigDataBowlAnalyticsEngine
    engine: BigDataBowlAnalyticsEngine = websocket.app.state.engine

    try:
        if claims.kind == "play":
            generator = stream_play_frames(engine, claims, chunk_size=settings.chunk_size)
        elif claims.kind == "drive":
            generator = stream_drive_frames(engine, claims, chunk_size=settings.chunk_size)
        else:
            await websocket.send_bytes(encode_ws_message(WS_MSG_ERROR, {
                "code": "unsupported_kind",
                "message": f"Token subject kind '{claims.kind}' is not supported.",
            }))
            await websocket.close(code=4000)
            return

        for frame_bytes in generator:
            await websocket.send_bytes(frame_bytes)

        await websocket.close(code=1000)

    except WebSocketDisconnect:
        logger.debug("WebSocket client disconnected mid-stream for subject=%s", claims.subject)
    except Exception as exc:
        logger.exception("Unexpected error streaming replay for subject=%s", claims.subject)
        try:
            await websocket.send_bytes(encode_ws_message(WS_MSG_ERROR, {
                "code": "internal_error",
                "message": "Internal streaming error.",
            }))
        except Exception:
            pass
        await websocket.close(code=1011)
