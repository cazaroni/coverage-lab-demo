from __future__ import annotations

from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine

from app.contracts.session import DBSessionContext


def normalize_database_url(database_url: str | None) -> str | None:
    if not database_url:
        return None

    url = make_url(database_url)
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+asyncpg")

    return url.render_as_string(hide_password=False)


class DatabaseSessionManager:
    def __init__(self, database_url: str | None) -> None:
        self.database_url = normalize_database_url(database_url)
        self.engine: AsyncEngine | None = (
            create_async_engine(self.database_url, pool_pre_ping=True) if self.database_url else None
        )

    async def dispose(self) -> None:
        if self.engine is not None:
            await self.engine.dispose()

    async def healthcheck(self) -> tuple[str, str]:
        if self.engine is None:
            return ("skipped", "DATABASE_URL is not configured.")

        try:
            async with self.engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
            return ("ok", "Postgres connection healthy.")
        except Exception as exc:  # pragma: no cover - exercised only with a real database
            return ("error", str(exc))

    @asynccontextmanager
    async def scoped_connection(self, db_session_context: DBSessionContext | None = None):
        if self.engine is None:
            yield None
            return

        async with self.engine.connect() as connection:
            async with connection.begin():
                if db_session_context is not None:
                    await self.apply_db_session_context(connection, db_session_context)
                yield connection

    async def apply_db_session_context(
        self, connection: AsyncConnection, db_session_context: DBSessionContext
    ) -> None:
        await connection.execute(
            text(
                """
                SELECT
                    set_config('app.current_user_id', :current_user_id, true),
                    set_config('app.current_team_id', :current_team_id, true),
                    set_config('app.current_role', :current_role, true)
                """
            ),
            {
                "current_user_id": db_session_context.current_user_id,
                "current_team_id": str(db_session_context.current_team_id),
                "current_role": db_session_context.current_role,
            },
        )

    async def probe_session_context(self, db_session_context: DBSessionContext) -> bool:
        if self.engine is None:
            return False

        async with self.scoped_connection(db_session_context) as connection:
            assert connection is not None
            result = await connection.execute(
                text(
                    """
                    SELECT
                        current_setting('app.current_user_id', true) AS current_user_id,
                        current_setting('app.current_team_id', true) AS current_team_id,
                        current_setting('app.current_role', true) AS current_role
                    """
                )
            )
            row = result.mappings().one()
            return (
                row["current_user_id"] == db_session_context.current_user_id
                and row["current_team_id"] == str(db_session_context.current_team_id)
                and row["current_role"] == db_session_context.current_role
            )

