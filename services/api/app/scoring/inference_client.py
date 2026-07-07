"""HTTP client for the inference service's protobuf scoring endpoint.

Transport is HTTP + protobuf body (ADR-aligned; gRPC can swap in later since the
messages are identical). When ``base_url`` is unset the client scores in-process
via the deterministic geometric fallback, so the route is transport-agnostic and
dev/tests need no running inference service.
"""

from __future__ import annotations

import httpx

from app.proto import inference_pb2
from app.scoring import local_scorer

_PROTOBUF_MEDIA_TYPE = "application/x-protobuf"


class InferenceError(RuntimeError):
    """Raised when the inference service returns a non-success response."""


class InferenceClient:
    def __init__(
        self,
        *,
        base_url: str | None,
        model_version: str,
        timeout_seconds: float = 5.0,
    ) -> None:
        self._base_url = base_url.rstrip("/") if base_url else None
        self._model_version = model_version
        self._timeout = timeout_seconds
        # Constructed lazily — no socket/connection work at init (lifespan runs in
        # every TestClient context).
        self._client: httpx.AsyncClient | None = None

    @property
    def uses_remote(self) -> bool:
        return self._base_url is not None

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(base_url=self._base_url, timeout=self._timeout)
        return self._client

    async def score(self, score_request: inference_pb2.ScoreRequest) -> inference_pb2.ScoreResponse:
        if self._base_url is None:
            return local_scorer.build_score_response(
                score_request, model_version=self._model_version
            )

        try:
            response = await self._http().post(
                "/score",
                content=score_request.SerializeToString(deterministic=True),
                headers={"content-type": _PROTOBUF_MEDIA_TYPE, "accept": _PROTOBUF_MEDIA_TYPE},
            )
        except httpx.HTTPError as exc:
            # Transport failure (service down, timeout, DNS) — surface as the single
            # error type the route handles, not a raw httpx 500.
            raise InferenceError(f"inference unreachable: {exc}") from exc

        if response.status_code != 200:
            raise InferenceError(
                f"inference /score returned {response.status_code}: {response.text[:200]}"
            )

        score_response = inference_pb2.ScoreResponse()
        try:
            score_response.ParseFromString(response.content)
        except Exception as exc:  # malformed/garbage body
            raise InferenceError(f"invalid ScoreResponse from inference: {exc}") from exc
        return score_response

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
