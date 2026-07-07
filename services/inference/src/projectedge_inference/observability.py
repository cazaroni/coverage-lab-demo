from __future__ import annotations

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider


def configure_observability(service_name: str) -> None:
    """
    Phase 0 OTel hook.
    Exporters/processors are intentionally left for platform wiring.
    """
    provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
    trace.set_tracer_provider(provider)

