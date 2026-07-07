from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel


class ErrorCode(StrEnum):
    AUTH_FAILED = "auth_failed"
    NO_ACTIVE_TEAM = "no_active_team"
    VALIDATION_FAILED = "validation_failed"
    NOT_FOUND = "not_found"
    UPSTREAM_TIMEOUT = "upstream_timeout"
    INTERNAL_ERROR = "internal_error"
    IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD = (
        "idempotency_key_reused_with_different_payload"
    )


class ErrorResponse(BaseModel):
    error_code: ErrorCode
    message: str

