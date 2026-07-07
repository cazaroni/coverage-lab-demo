"""Deterministic geometric scorer — the "model" behind the fake bundle.

The numeric core ``compute_scores`` is byte-for-byte identical to the API's
offline fallback (services/api/app/scoring/local_scorer.py::compute_scores) so the
over-the-wire and in-process paths produce the same numbers; a parity test guards
against drift. Keep the two copies in sync — change one, change both.

Scores from x/y only (the source data has no speed/orientation). Pure stdlib for
the math; numpy is used only to load the bundle's centroid artifact. The bundle's
centroids/calibrator/weights make the bundle a complete, validatable artifact set;
the numeric DCI/DIS is centroid-free so it stays reproducible without the bundle
(and identical to the API fallback).
"""

from __future__ import annotations

import math
from pathlib import Path

from .manifest import BundleManifest, validate_bundle_manifest
from .proto import inference_pb2
from .proto.payload_hash import hash_graph_payload

# ── Canonical geometric model constants (must match the API fallback copy) ───────
# node_stress is the primitive: each defender's distance from the defensive
# centroid, normalized so a defender _STRESS_SCALE yards out is fully stressed.
# Everything else derives from it, matching how the forensics panel and the replay
# DCI timeline already aggregate node_stress (frame_dci = 1 - mean(node_stress)).
_STRESS_SCALE = 12.0  # yards from the defensive centroid at which node_stress -> 1.0
_DRIFT_SCALE = 8.0    # normalizes frame-to-frame structural drift into [0, 1]


def _clamp(value: float) -> float:
    return 0.0 if value < 0.0 else 1.0 if value > 1.0 else value


def compute_scores(payload: "inference_pb2.GraphPayload") -> dict:
    """Deterministic geometric scoring over a GraphPayload's x/y positions.

    node_stress-primitive: per-defender node_stress = dist-from-centroid/scale;
    frame_dci = 1 - mean(node_stress); dci = mean(frame_dci). Returns dci, dis,
    frame_scores [(idx, dci, dis)], node_stress_by_frame {idx: {entity_id: stress}}
    (used to regenerate fixtures), entity_stress {entity_id: mean stress}, and
    score_status. Reads attributes only, so it works against any GraphPayload binding.
    """
    defense_ids = {e.entity_id for e in payload.entities if not e.is_offense}

    frame_scores: list[tuple[int, float, float]] = []
    node_stress_by_frame: dict[int, dict[str, float]] = {}
    entity_stress_sum: dict[str, float] = {}
    entity_stress_n: dict[str, int] = {}

    prev_centroid: tuple[float, float] | None = None
    prev_mean_stress: float | None = None

    for frame in payload.features_by_frame:
        pts = [
            (s.entity_id, s.x, s.y)
            for s in frame.entity_states
            if s.entity_id in defense_ids and s.is_present
        ]
        if not pts:
            continue
        cx = sum(p[1] for p in pts) / len(pts)
        cy = sum(p[2] for p in pts) / len(pts)

        stresses: dict[str, float] = {}
        for eid, x, y in pts:
            node_stress = _clamp(math.hypot(x - cx, y - cy) / _STRESS_SCALE)
            stresses[eid] = node_stress
            entity_stress_sum[eid] = entity_stress_sum.get(eid, 0.0) + node_stress
            entity_stress_n[eid] = entity_stress_n.get(eid, 0) + 1

        frame_index = int(frame.frame_index)
        node_stress_by_frame[frame_index] = stresses
        mean_stress = sum(stresses.values()) / len(stresses)
        frame_dci = _clamp(1.0 - mean_stress)

        if prev_centroid is None:
            frame_dis = 0.0
        else:
            centroid_drift = math.hypot(cx - prev_centroid[0], cy - prev_centroid[1]) / _DRIFT_SCALE
            spread_change = abs(mean_stress - (prev_mean_stress or 0.0))
            frame_dis = _clamp(centroid_drift + spread_change)

        frame_scores.append((frame_index, frame_dci, frame_dis))
        prev_centroid = (cx, cy)
        prev_mean_stress = mean_stress

    if frame_scores:
        dci = sum(f[1] for f in frame_scores) / len(frame_scores)
        dis = sum(f[2] for f in frame_scores) / len(frame_scores)
        status = "scored"
    else:
        dci, dis, status = 0.0, 0.0, "no_defensive_frames"

    entity_stress = {
        eid: entity_stress_sum[eid] / entity_stress_n[eid] for eid in entity_stress_sum
    }

    return {
        "dci": float(dci),
        "dis": float(dis),
        "frame_scores": frame_scores,
        "node_stress_by_frame": node_stress_by_frame,
        "entity_stress": entity_stress,
        "score_status": status,
    }


class GeometricScorer:
    """Loads a validated bundle and scores parsed ScoreRequests."""

    def __init__(self, manifest: BundleManifest, centroids) -> None:
        self.manifest = manifest
        self.centroids = centroids  # numpy array; kept for archetype labeling / completeness

    @classmethod
    def from_bundle(cls, bundle_root: Path) -> "GeometricScorer":
        import numpy as np

        manifest = validate_bundle_manifest(bundle_root)
        centroids = np.load(bundle_root / "centroids.npy")
        # Prove the artifact is loadable and matches the manifest's declared shape.
        if manifest.archetype_count is not None and centroids.shape[0] != manifest.archetype_count:
            raise ValueError(
                f"centroids rows {centroids.shape[0]} != archetype_count {manifest.archetype_count}"
            )
        if manifest.embedding_dim is not None and centroids.shape[1] != manifest.embedding_dim:
            raise ValueError(
                f"centroids cols {centroids.shape[1]} != embedding_dim {manifest.embedding_dim}"
            )
        return cls(manifest, centroids)

    @property
    def model_version(self) -> str:
        return self.manifest.model_version

    def score(self, score_request: "inference_pb2.ScoreRequest") -> "inference_pb2.ScoreResponse":
        payload = score_request.payload
        scores = compute_scores(payload)

        result = inference_pb2.ScorePlayResult(
            dci=scores["dci"],
            dis=scores["dis"],
            score_status=scores["score_status"],
        )
        for frame_index, fdci, fdis in scores["frame_scores"]:
            result.frame_scores.append(
                inference_pb2.FrameScore(frame_index=frame_index, dci=fdci, dis=fdis)
            )
        for entity_id, stress in sorted(scores["entity_stress"].items()):
            result.stress.append(inference_pb2.EntityStress(entity_id=entity_id, stress=stress))

        # ADR-0001 §4: inference computes the canonical hash from the payload it
        # received (the ScoreRequest proto does not carry one). The backend
        # independently hashes the same GraphPayload bytes for its cache key; both
        # must agree (guarded by the hash-parity test).
        return inference_pb2.ScoreResponse(
            model_version=self.model_version,
            payload_hash=hash_graph_payload(payload),
            result=result,
        )
