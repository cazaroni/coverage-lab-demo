from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class ReadinessState:
    is_ready: bool = False
    reason: str = "bundle_not_validated"
    model_version: str = ""
    last_checked_at: datetime | None = None

    def mark_ready(self, *, model_version: str) -> None:
        self.is_ready = True
        self.reason = "ok"
        self.model_version = model_version
        self.last_checked_at = datetime.now(timezone.utc)

    def mark_not_ready(self, *, reason: str) -> None:
        self.is_ready = False
        self.reason = reason
        self.last_checked_at = datetime.now(timezone.utc)

