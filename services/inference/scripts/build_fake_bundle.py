"""Build the deterministic "fake" model bundle for ProjectEdge inference.

This is NOT a trained model. It produces a complete, validatable artifact set
(weights + centroids + calibrator + manifest) so the serving contract — bundle
validation, readiness, model_version propagation — is exercised for real. The
actual scoring is the deterministic geometric function in scorer.py.

Run:  python services/inference/scripts/build_fake_bundle.py
Regenerates services/inference/bundle/ in place (deterministic — no randomness).
"""

from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent.parent / "bundle"
MODEL_VERSION = "geom-fake-v1"
PAYLOAD_SCHEMA_VERSION = "v1"


def _write_npy(path: Path, rows: list[list[float]]) -> None:
    """Write a 2-D float64 .npy without importing numpy (deterministic bytes)."""
    n, m = len(rows), len(rows[0])
    header = (
        f"{{'descr': '<f8', 'fortran_order': False, 'shape': ({n}, {m}), }}"
    )
    # numpy pads the header with spaces so (len(magic)+2+2+len(header)+1) % 64 == 0.
    prefix = 10  # \x93NUMPY + version(2) + headerlen(2)
    total = prefix + len(header) + 1
    pad = (64 - total % 64) % 64
    header = header + " " * pad + "\n"
    data = b"\x93NUMPY" + bytes([1, 0]) + struct.pack("<H", len(header)) + header.encode("latin1")
    for row in rows:
        for value in row:
            data += struct.pack("<d", value)
    path.write_bytes(data)


def _digest(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    BUNDLE.mkdir(parents=True, exist_ok=True)

    # 3 archetype centroids in (mean_x_offset, dispersion) space. Present for bundle
    # completeness + readiness validation; the numeric DCI/DIS is centroid-free so
    # it stays reproducible without the bundle (and identical to the API fallback).
    centroids = [[0.0, 5.0], [0.0, 8.0], [0.0, 12.0]]
    _write_npy(BUNDLE / "centroids.npy", centroids)

    (BUNDLE / "calibrator.json").write_text(
        json.dumps({"kind": "affine", "scale": 1.0, "offset": 0.0}, indent=2) + "\n",
        encoding="utf-8",
    )
    (BUNDLE / "weights.json").write_text(
        json.dumps({"kind": "placeholder", "note": "fake geometric model; no trained weights"}, indent=2)
        + "\n",
        encoding="utf-8",
    )

    manifest = {
        "model_version": MODEL_VERSION,
        "payload_schema_version": PAYLOAD_SCHEMA_VERSION,
        "feature_bundle_version": "geom-v1",
        "runtime": {"python": "3.11", "scorer": "geometric-deterministic"},
        "archetype_count": len(centroids),
        "embedding_dim": len(centroids[0]),
        "artifacts": {
            "weights": _digest(BUNDLE / "weights.json"),
            "centroids": _digest(BUNDLE / "centroids.npy"),
            "calibrator": _digest(BUNDLE / "calibrator.json"),
        },
    }
    (BUNDLE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote bundle -> {BUNDLE}")
    for name in ("manifest.json", "centroids.npy", "calibrator.json", "weights.json"):
        print(f"  {name}")


if __name__ == "__main__":
    main()
