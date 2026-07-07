from __future__ import annotations

from pydantic import BaseModel


class DependencyHealth(BaseModel):
    name: str
    status: str
    detail: str | None = None


class HealthzResponse(BaseModel):
    service: str
    status: str
    version: str
    dependencies: list[DependencyHealth]

