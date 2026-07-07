from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from opentelemetry import trace
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

from .manifest import validate_bundle_manifest
from .observability import configure_observability
from .proto import inference_pb2
from .readiness import ReadinessState
from .scorer import GeometricScorer
from .settings import Settings

HTTP_REQUESTS_TOTAL = Counter(
    "projectedge_inference_http_requests_total",
    "Total HTTP requests handled by the inference scaffold.",
    ["path", "status_code"],
)

_PROTOBUF_MEDIA_TYPE = "application/x-protobuf"
_tracer = trace.get_tracer(__name__)


def create_app() -> FastAPI:
    settings = Settings.from_env()
    readiness = ReadinessState()

    app = FastAPI(title=settings.service_name, version="0.1.0")
    app.state.scorer = None

    @app.on_event("startup")
    async def startup_event() -> None:
        configure_observability(settings.service_name)
        try:
            scorer = GeometricScorer.from_bundle(settings.bundle_root)
            app.state.scorer = scorer
            readiness.mark_ready(model_version=scorer.model_version)
        except Exception as exc:  # bundle missing/incomplete -> stay not-ready
            app.state.scorer = None
            readiness.mark_not_ready(reason=f"bundle_validation_failed:{type(exc).__name__}")

    @app.get("/healthz")
    async def healthz() -> JSONResponse:
        HTTP_REQUESTS_TOTAL.labels(path="/healthz", status_code="200").inc()
        return JSONResponse(
            content={
                "status": "ok",
                "service": settings.service_name,
                # Report the loaded bundle version when ready, else the configured default.
                "model_version": readiness.model_version or settings.model_version,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    @app.get("/readyz")
    async def readyz() -> JSONResponse:
        if not readiness.is_ready:
            HTTP_REQUESTS_TOTAL.labels(path="/readyz", status_code="503").inc()
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "not_ready",
                    "reason": readiness.reason,
                    "model_version": settings.model_version,
                },
            )

        HTTP_REQUESTS_TOTAL.labels(path="/readyz", status_code="200").inc()
        return JSONResponse(
            content={
                "status": "ready",
                "reason": readiness.reason,
                "model_version": readiness.model_version,
                "last_checked_at": readiness.last_checked_at.isoformat()
                if readiness.last_checked_at
                else None,
            }
        )

    @app.post("/score")
    async def score(request: Request) -> Response:
        if not readiness.is_ready or app.state.scorer is None:
            HTTP_REQUESTS_TOTAL.labels(path="/score", status_code="503").inc()
            raise HTTPException(
                status_code=503,
                detail={"status": "not_ready", "reason": readiness.reason},
            )

        body = await request.body()
        score_request = inference_pb2.ScoreRequest()
        try:
            score_request.ParseFromString(body)
        except Exception as exc:  # malformed protobuf body
            HTTP_REQUESTS_TOTAL.labels(path="/score", status_code="400").inc()
            raise HTTPException(status_code=400, detail={"error": f"invalid ScoreRequest: {exc}"})

        with _tracer.start_as_current_span("inference.score"):
            score_response = app.state.scorer.score(score_request)

        HTTP_REQUESTS_TOTAL.labels(path="/score", status_code="200").inc()
        return Response(
            content=score_response.SerializeToString(deterministic=True),
            media_type=_PROTOBUF_MEDIA_TYPE,
        )

    @app.get("/metrics")
    async def metrics() -> Response:
        HTTP_REQUESTS_TOTAL.labels(path="/metrics", status_code="200").inc()
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    return app


app = create_app()
