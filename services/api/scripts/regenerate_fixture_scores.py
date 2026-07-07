"""Regenerate the fixture's scored columns from the geometric scorer so every
surface agrees (surface unification).

The replay HUD, the forensics panel (frame aggregates + collapse window), and the
frontend DCI timeline all derive from the motion `node_stress`; play detail / catalog
/ forensics headline read the play-level `dci`/`dis`. Before this script those came
from the research model while `POST /score` returned geometric values — so the same
play showed two different numbers.

This rewrites, for every play that has a motion sample, the motion CSV's
`node_stress` / `frame_dci` / `frame_dis` and the play's `dci`/`dis` in plays.csv
using the SAME geometric scorer (`build_graph_payload` + `compute_scores`) that
POST /score uses. After this, all surfaces show one coherent set of numbers.

Run:  python services/api/scripts/regenerate_fixture_scores.py
Deterministic; only the 30 motion plays are touched (others have no x/y to score).
Original values remain in git history.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # services/api/scripts -> repo root
sys.path.insert(0, str(ROOT / "services" / "api"))

from app.scoring.local_scorer import compute_scores  # noqa: E402
from app.scoring.payload import build_graph_payload  # noqa: E402
from projectedge_analytics.models import PlayMovementFrame  # noqa: E402

DATASET = ROOT / "packages" / "schemas" / "fixtures" / "datasets" / "bigdatabowl_2023"
MOTION_DIR = DATASET / "motion"
PLAYS_CSV = DATASET / "plays.csv"
SCHEMA_VERSION = "v1"


def _detect_newline(path: Path) -> str:
    return "\r\n" if b"\r\n" in path.read_bytes() else "\n"


def _read_csv(path: Path) -> tuple[list[str], list[dict]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict], newline: str) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator=newline)
        writer.writeheader()
        writer.writerows(rows)


def regen_motion_file(path: Path) -> tuple[str, float, float]:
    newline = _detect_newline(path)
    fieldnames, rows = _read_csv(path)
    frames = [
        PlayMovementFrame(
            play_id=r["play_id"],
            game_id=r["game_id"],
            source_play_id=int(r["source_play_id"]),
            frame_id=int(r["frame_id"]),
            nfl_id=int(r["nfl_id"]),
            player_label=r["player_label"],
            player_position=r["player_position"],
            player_side=r["player_side"],
            x=float(r["x"]),
            y=float(r["y"]),
            s=0.0,
            o=0.0,
            dir=0.0,
            node_stress=float(r["node_stress"]),
            frame_dci=float(r["frame_dci"]),
            frame_dis=float(r["frame_dis"]),
        )
        for r in rows
    ]
    payload = build_graph_payload(frames, schema_version=SCHEMA_VERSION)
    scores = compute_scores(payload)
    ns_by_frame = scores["node_stress_by_frame"]
    frame_dci = {fi: dci for fi, dci, _ in scores["frame_scores"]}
    frame_dis = {fi: dis for fi, _, dis in scores["frame_scores"]}

    for r in rows:
        fid = int(r["frame_id"])
        if r["player_side"] == "Defense":
            r["node_stress"] = f"{ns_by_frame.get(fid, {}).get(r['nfl_id'], 0.0):.6f}"
        else:
            r["node_stress"] = "0.0"
        r["frame_dci"] = f"{frame_dci.get(fid, 0.0):.6f}"
        r["frame_dis"] = f"{frame_dis.get(fid, 0.0):.6f}"

    _write_csv(path, fieldnames, rows, newline)
    return rows[0]["play_id"], scores["dci"], scores["dis"]


def main() -> None:
    play_scores: dict[str, tuple[float, float]] = {}
    for path in sorted(MOTION_DIR.glob("*.csv")):
        play_id, dci, dis = regen_motion_file(path)
        play_scores[play_id] = (dci, dis)
        print(f"  {play_id}: dci={dci:.4f} dis={dis:.4f}")

    plays_newline = _detect_newline(PLAYS_CSV)
    fieldnames, rows = _read_csv(PLAYS_CSV)
    updated = 0
    for r in rows:
        if r["play_id"] in play_scores:
            dci, dis = play_scores[r["play_id"]]
            r["dci"] = f"{dci:.6f}"
            r["dis"] = f"{dis:.6f}"
            updated += 1
    _write_csv(PLAYS_CSV, fieldnames, rows, plays_newline)
    print(f"regenerated {len(play_scores)} motion plays; updated {updated} rows in plays.csv")


if __name__ == "__main__":
    main()
