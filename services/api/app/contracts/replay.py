from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ReplaySessionResponse(BaseModel):
    token: str
    expires_at: datetime
