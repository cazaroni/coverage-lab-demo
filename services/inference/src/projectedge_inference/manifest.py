from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError

# Artifacts that make a bundle complete and scoreable (beyond manifest.json).
REQUIRED_ARTIFACTS = ("weights.json", "centroids.npy", "calibrator.json")
# manifest.artifacts logical name -> on-disk filename.
_ARTIFACT_FILES = {
    "weights": "weights.json",
    "centroids": "centroids.npy",
    "calibrator": "calibrator.json",
}


class BundleManifest(BaseModel):
    model_version: str
    payload_schema_version: str
    feature_bundle_version: str
    runtime: dict[str, Any]
    archetype_count: int | None = None
    embedding_dim: int | None = None
    artifacts: dict[str, str] | None = None


def validate_bundle_manifest(bundle_root: Path) -> BundleManifest:
    """Validate that the bundle has a well-formed manifest AND its required
    artifacts are present. Readiness depends on a *complete* bundle, not just a
    parseable manifest."""
    manifest_path = bundle_root / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing bundle manifest: {manifest_path}")

    document = json.loads(manifest_path.read_text(encoding="utf-8"))
    try:
        manifest = BundleManifest.model_validate(document)
    except ValidationError as exc:
        raise ValueError("Bundle manifest schema validation failed.") from exc

    missing = [name for name in REQUIRED_ARTIFACTS if not (bundle_root / name).exists()]
    if missing:
        raise FileNotFoundError(f"Bundle is missing required artifacts: {', '.join(missing)}")

    # Integrity: a present-but-corrupt artifact must fail readiness, not load silently.
    # Verify each declared digest (artifacts travel together — ARCHITECTURE.md §5/principle 2).
    for name, declared in (manifest.artifacts or {}).items():
        filename = _ARTIFACT_FILES.get(name)
        if filename is None:
            continue
        actual = "sha256:" + hashlib.sha256((bundle_root / filename).read_bytes()).hexdigest()
        if declared != actual:
            raise ValueError(
                f"Bundle artifact {filename} digest mismatch: manifest={declared} actual={actual}"
            )

    return manifest
