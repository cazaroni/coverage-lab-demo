from __future__ import annotations

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError


class TokenClaims:
    """Parsed, verified replay session token claims."""

    __slots__ = ("subject", "team_id", "kind", "resource_id")

    def __init__(self, subject: str, team_id: str) -> None:
        self.subject = subject
        self.team_id = team_id
        # subject format: "play:<play_id>" or "drive:<drive_id>"
        kind, _, resource_id = subject.partition(":")
        self.kind: str = kind        # "play" | "drive"
        self.resource_id: str = resource_id


class ReplayTokenError(Exception):
    """Raised when a replay token cannot be verified."""


def verify_replay_token(token: str, secret: str) -> TokenClaims:
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["sub", "team_id", "exp", "iss"]},
            issuer="projectedge-api",
        )
    except ExpiredSignatureError as exc:
        raise ReplayTokenError("Replay session token has expired.") from exc
    except InvalidTokenError as exc:
        raise ReplayTokenError(f"Invalid replay session token: {exc}") from exc

    subject: str = claims["sub"]
    team_id: str = claims["team_id"]
    if ":" not in subject:
        raise ReplayTokenError(f"Unrecognised token subject format: {subject!r}")

    return TokenClaims(subject=subject, team_id=team_id)
