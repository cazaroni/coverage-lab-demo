from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    service_name: str
    model_version: str
    bundle_root: Path

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            service_name=os.getenv("INFERENCE_SERVICE_NAME", "projectedge-inference"),
            model_version=os.getenv("INFERENCE_MODEL_VERSION", "geom-fake-v1"),
            bundle_root=Path(os.getenv("INFERENCE_BUNDLE_ROOT", "./bundle")).resolve(),
        )

