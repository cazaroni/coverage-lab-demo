"""Shared replay-session token minting (HS256 JWT), used by both the replay-session
routes and the intelligence `open_replay` tool. Single source so both paths produce
identical, verifiable tokens."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.config import Settings
from app.contracts import ReplaySessionResponse


def issue_replay_token(*, subject: str, team_id: str, settings: Settings) -> ReplaySessionResponse:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.replay_session_ttl_seconds)
    payload = {
        "sub": subject,
        "team_id": team_id,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "iss": "projectedge-api",
    }
    token = jwt.encode(payload, settings.replay_session_secret, algorithm="HS256")
    return ReplaySessionResponse(token=token, expires_at=expires_at)
