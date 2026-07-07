from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import jwt
from fastapi import Request
from jwt import InvalidTokenError

from app.config import Settings
from app.contracts.session import MembershipSummary, SessionContext


class AuthenticationError(Exception):
    pass


class AuthorizationError(Exception):
    pass


class AuthProvider(Protocol):
    def authenticate(self, request: Request) -> SessionContext: ...


def _membership_summaries(raw_memberships: list[dict[str, Any]] | None) -> list[MembershipSummary]:
    if not raw_memberships:
        return []
    memberships: list[MembershipSummary] = []
    for item in raw_memberships:
        if "team_id" not in item:
            continue
        memberships.append(
            MembershipSummary(
                team_id=item["team_id"],
                role=str(item.get("role", "member")),
                organization_id=item.get("organization_id"),
            )
        )
    return memberships


@dataclass(slots=True)
class DevelopmentAuthProvider:
    settings: Settings

    def authenticate(self, request: Request) -> SessionContext:
        if not self.settings.development_auto_auth and "authorization" not in request.headers:
            raise AuthenticationError("Missing Authorization header.")

        user_id = request.headers.get("x-projectedge-user-id", self.settings.development_user_id)
        raw_team_id = request.headers.get(
            "x-projectedge-team-id", str(self.settings.development_team_id)
        )
        configured_aliases = {
            alias.strip().lower()
            for alias in self.settings.development_team_aliases
            if alias.strip()
        }
        if raw_team_id.lower() in configured_aliases:
            team_id = str(self.settings.development_team_id)
        else:
            team_id = raw_team_id
        role = request.headers.get("x-projectedge-role", self.settings.development_role)
        session_id = request.headers.get(
            "x-projectedge-session-id", self.settings.development_session_id
        )
        team_name = request.headers.get("x-projectedge-team-name", self.settings.development_team_name)

        return SessionContext(
            user_id=user_id,
            active_team_id=team_id,
            role=role,
            session_id=session_id,
            memberships=[MembershipSummary(team_id=team_id, role=role)],
            provider="development",
            team_name=team_name,
        )


@dataclass(slots=True)
class ClerkJWTAuthProvider:
    settings: Settings

    def authenticate(self, request: Request) -> SessionContext:
        auth_header = request.headers.get("authorization", "")
        scheme, _, token = auth_header.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise AuthenticationError("Expected a Bearer token.")

        if not self.settings.clerk_jwt_public_key:
            raise AuthenticationError("Clerk JWT verification key is not configured.")

        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "issuer": self.settings.clerk_jwt_issuer,
        }
        if self.settings.clerk_jwt_audience:
            decode_kwargs["audience"] = self.settings.clerk_jwt_audience

        try:
            claims = jwt.decode(
                token,
                self.settings.clerk_jwt_public_key,
                **decode_kwargs,
            )
        except InvalidTokenError as exc:
            raise AuthenticationError("JWT verification failed.") from exc

        active_team_id = claims.get(self.settings.clerk_active_team_claim)
        if not active_team_id:
            raise AuthorizationError("Authenticated user does not have an active_team_id.")

        user_id = claims.get(self.settings.clerk_user_id_claim)
        session_id = claims.get(self.settings.clerk_session_id_claim) or ""
        if not user_id or not session_id:
            raise AuthenticationError("JWT is missing required subject or session claims.")

        role = str(claims.get(self.settings.clerk_role_claim, "member"))
        memberships = _membership_summaries(claims.get(self.settings.clerk_memberships_claim))

        return SessionContext(
            user_id=str(user_id),
            active_team_id=active_team_id,
            role=role,
            session_id=str(session_id),
            memberships=memberships or [MembershipSummary(team_id=active_team_id, role=role)],
            provider="clerk",
        )


def build_auth_provider(settings: Settings) -> AuthProvider:
    if settings.auth_mode == "clerk":
        return ClerkJWTAuthProvider(settings=settings)
    return DevelopmentAuthProvider(settings=settings)

