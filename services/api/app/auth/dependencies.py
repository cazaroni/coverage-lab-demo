from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status

from app.auth.providers import (
    AuthenticationError,
    AuthorizationError,
    AuthProvider,
    build_auth_provider,
)
from app.config import Settings, get_settings
from app.contracts import ErrorCode, SessionContext


def get_runtime_settings() -> Settings:
    return get_settings()


def get_auth_provider(settings: Settings = Depends(get_runtime_settings)) -> AuthProvider:
    return build_auth_provider(settings)


def get_session_context(
    request: Request,
    auth_provider: AuthProvider = Depends(get_auth_provider),
) -> SessionContext:
    try:
        return auth_provider.authenticate(request)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": ErrorCode.AUTH_FAILED, "message": str(exc)},
        ) from exc
    except AuthorizationError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": ErrorCode.NO_ACTIVE_TEAM, "message": str(exc)},
        ) from exc

