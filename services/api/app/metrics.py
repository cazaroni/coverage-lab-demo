from __future__ import annotations

from time import perf_counter

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


HTTP_REQUESTS_TOTAL = Counter(
    "projectedge_api_http_requests_total",
    "Total HTTP requests handled by the API service.",
    ["method", "path", "status_code"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "projectedge_api_http_request_duration_seconds",
    "HTTP request latency for the API service.",
    ["method", "path"],
)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started_at = perf_counter()
        response = await call_next(request)
        path = request.url.path
        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            path=path,
            status_code=str(response.status_code),
        ).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            path=path,
        ).observe(perf_counter() - started_at)
        return response


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

