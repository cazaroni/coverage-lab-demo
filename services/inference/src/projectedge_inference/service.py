from __future__ import annotations

import bentoml

from .app import app


@bentoml.asgi_app(app, path="/")
@bentoml.service(name="projectedge-inference")
class InferenceService:
    """Phase 0 scaffold service. Real scoring APIs are added in later phases."""


svc = InferenceService()

