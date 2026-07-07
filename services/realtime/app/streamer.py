from __future__ import annotations

import json
from typing import Any, Generator

from projectedge_analytics import BigDataBowlAnalyticsEngine
from projectedge_analytics.errors import AnalyticsReadNotFoundError

from .inference_pb2 import EntityPosition, ReplayFrame
from .token import TokenClaims

WS_MSG_INIT = 1
WS_MSG_FRAME = 2
WS_MSG_END = 3
WS_MSG_ERROR = 4


def encode_ws_message(message_type: int, payload: dict[str, Any] | bytes | None = None) -> bytes:
    if payload is None:
        return bytes([message_type])
    if isinstance(payload, bytes):
        return bytes([message_type]) + payload
    return bytes([message_type]) + json.dumps(payload, separators=(",", ":")).encode("utf-8")


def _serialize_replay_frame(
    *,
    frame_id: int,
    players: list[dict[str, Any]],
    clip_index: int | None = None,
    is_bridge: bool | None = None,
) -> bytes:
    frame = ReplayFrame(frame_id=frame_id)
    if clip_index is not None:
        frame.clip_index = clip_index
    if is_bridge is not None:
        frame.is_bridge = is_bridge

    for p in players:
        entity = EntityPosition(
            nfl_id=p.get("nfl_id") or 0,
            player_label=p.get("player_label") or "",
            player_position=p.get("player_position") or "",
            player_side=p.get("player_side") or "",
            x=float(p.get("x") or 0.0),
            y=float(p.get("y") or 0.0),
            s=float(p.get("s") or 0.0),
            o=float(p.get("o") or 0.0),
            dir=float(p.get("dir") or 0.0),
            node_stress=float(p.get("node_stress") or 0.0),
            is_ball_carrier=bool(p.get("is_ball_carrier", False)),
        )
        if p.get("frame_dci") is not None:
            entity.frame_dci = float(p["frame_dci"])
        if p.get("frame_dis") is not None:
            entity.frame_dis = float(p["frame_dis"])
        frame.players.append(entity)

    return frame.SerializeToString()


def _build_init_message(kind: str, resource_id: str, frame_count: int, model_version: str) -> dict[str, Any]:
    msg: dict[str, Any] = {
        "type": "init",
        "frame_count": frame_count,
        "model_version": model_version,
    }
    if kind == "play":
        msg["play_id"] = resource_id
    else:
        msg["drive_id"] = resource_id
    return msg


def stream_play_frames(
    engine: BigDataBowlAnalyticsEngine,
    claims: TokenClaims,
    *,
    chunk_size: int = 60,
) -> Generator[bytes, None, None]:
    from uuid import UUID

    team_id = UUID(claims.team_id)
    play_id = claims.resource_id

    try:
        play = engine.get_play_detail(play_id=play_id, team_id=team_id)
    except AnalyticsReadNotFoundError as exc:
        yield encode_ws_message(WS_MSG_ERROR, {"code": "not_found", "message": str(exc)})
        return

    frames = engine.list_play_movement(play_id=play_id, team_id=team_id)
    frame_ids = sorted({f.frame_id for f in frames})
    frame_count = len(frame_ids)

    yield encode_ws_message(
        WS_MSG_INIT,
        _build_init_message("play", play_id, frame_count, play.model_version or "unknown"),
    )

    # Group rows by frame_id and stream in chunks
    by_frame: dict[int, list[dict[str, Any]]] = {}
    for f in frames:
        by_frame.setdefault(f.frame_id, []).append({
            "nfl_id": f.nfl_id,
            "player_label": f.player_label,
            "player_position": f.player_position,
            "player_side": f.player_side,
            "x": f.x,
            "y": f.y,
            "s": f.s,
            "o": f.o,
            "dir": f.dir,
            "node_stress": f.node_stress,
            "frame_dci": f.frame_dci,
            "frame_dis": f.frame_dis,
            "is_ball_carrier": False,
        })

    chunk: list[bytes] = []
    for fid in sorted(by_frame):
        chunk.append(
            encode_ws_message(
                WS_MSG_FRAME,
                _serialize_replay_frame(frame_id=fid, players=by_frame[fid]),
            )
        )
        if len(chunk) >= chunk_size:
            for message in chunk:
                yield message
            chunk = []
    if chunk:
        for message in chunk:
            yield message

    yield encode_ws_message(WS_MSG_END)


def stream_drive_frames(
    engine: BigDataBowlAnalyticsEngine,
    claims: TokenClaims,
    *,
    chunk_size: int = 60,
) -> Generator[bytes, None, None]:
    from uuid import UUID

    team_id = UUID(claims.team_id)
    drive_id = claims.resource_id

    try:
        drive = engine.get_drive(team_id=team_id, drive_id=drive_id)
    except AnalyticsReadNotFoundError as exc:
        yield encode_ws_message(WS_MSG_ERROR, {"code": "not_found", "message": str(exc)})
        return

    raw_frames = engine.get_drive_movement(team_id=team_id, drive_id=drive_id)
    frame_count = len({f.frame_id for f in raw_frames})

    yield encode_ws_message(
        WS_MSG_INIT,
        _build_init_message("drive", drive_id, frame_count, "bigdatabowl-fixture"),
    )

    # Group rows by (frame_id, clip_index)
    by_frame: dict[tuple[int, int], list[dict[str, Any]]] = {}
    for f in raw_frames:
        key = (f.frame_id, f.clip_index)
        by_frame.setdefault(key, []).append({
            "nfl_id": f.nfl_id,
            "player_label": f.player_label,
            "player_position": f.player_position,
            "player_side": f.player_side,
            "x": f.x,
            "y": f.y,
            "s": f.s,
            "o": f.o,
            "dir": f.dir,
            "node_stress": f.node_stress,
            "is_ball_carrier": False,
            "is_bridge": f.is_bridge,
        })

    chunk: list[bytes] = []
    for (fid, clip_idx) in sorted(by_frame):
        chunk.append(
            encode_ws_message(
                WS_MSG_FRAME,
                _serialize_replay_frame(
                    frame_id=fid,
                    clip_index=clip_idx,
                    is_bridge=by_frame[(fid, clip_idx)][0]["is_bridge"],
                    players=by_frame[(fid, clip_idx)],
                ),
            )
        )
        if len(chunk) >= chunk_size:
            for message in chunk:
                yield message
            chunk = []
    if chunk:
        for message in chunk:
            yield message

    yield encode_ws_message(WS_MSG_END)
