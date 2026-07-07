from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class MembershipSummary(BaseModel):
    team_id: UUID
    role: str
    organization_id: str | None = None


class SessionContext(BaseModel):
    user_id: str
    active_team_id: UUID
    role: str
    session_id: str
    memberships: list[MembershipSummary]
    provider: str = "clerk"
    team_name: str | None = None


class DBSessionContext(BaseModel):
    current_user_id: str
    current_team_id: UUID
    current_role: str

    @classmethod
    def from_session_context(cls, session_context: SessionContext) -> "DBSessionContext":
        return cls(
            current_user_id=session_context.user_id,
            current_team_id=session_context.active_team_id,
            current_role=session_context.role,
        )

    def as_postgres_settings(self) -> dict[str, str]:
        return {
            "app.current_user_id": self.current_user_id,
            "app.current_team_id": str(self.current_team_id),
            "app.current_role": self.current_role,
        }


class SessionUserView(BaseModel):
    user_id: str
    session_id: str


class SessionTeamView(BaseModel):
    team_id: UUID
    role: str
    name: str | None = None


class SessionResponse(BaseModel):
    user: SessionUserView
    team: SessionTeamView
    provider: str
    db_session_context_applied: bool = False

    @classmethod
    def from_session_context(
        cls, session_context: SessionContext, *, db_session_context_applied: bool
    ) -> "SessionResponse":
        return cls(
            user=SessionUserView(
                user_id=session_context.user_id,
                session_id=session_context.session_id,
            ),
            team=SessionTeamView(
                team_id=session_context.active_team_id,
                role=session_context.role,
                name=session_context.team_name,
            ),
            provider=session_context.provider,
            db_session_context_applied=db_session_context_applied,
        )

