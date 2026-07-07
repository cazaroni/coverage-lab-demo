"""Score cache. Cache identity is ADR-0001 §2: ``team_id:model_version:payload_hash``.

Two backends behind one interface, chosen by whether a Postgres engine exists:
- InMemoryScoreCache  — dict-backed, the dev/test path when DATABASE_URL is unset.
- PostgresScoreCache  — ml.play_scores, written under the caller's RLS context.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol
from uuid import UUID

from sqlalchemy import text

from app.contracts.session import DBSessionContext
from app.db import DatabaseSessionManager

_DDL_PATH = Path(__file__).resolve().parent.parent / "db" / "sql" / "0001_ml_play_scores.sql"


@dataclass(slots=True)
class CachedScore:
    dci: float | None
    dis: float | None
    score_status: str
    frame_scores: list[dict] = field(default_factory=list)

    def as_score_response_dict(self) -> dict:
        return {
            "dci": self.dci,
            "dis": self.dis,
            "score_status": self.score_status,
            "frame_scores": self.frame_scores,
        }


def _cache_key(team_id: UUID, model_version: str, payload_hash: str) -> str:
    return f"{team_id}:{model_version}:{payload_hash}"


class ScoreCache(Protocol):
    async def get(
        self,
        *,
        team_id: UUID,
        model_version: str,
        payload_hash: str,
        db_session_context: DBSessionContext | None = None,
    ) -> CachedScore | None: ...

    async def put(
        self,
        *,
        team_id: UUID,
        model_version: str,
        payload_hash: str,
        play_id: str,
        entry: CachedScore,
        db_session_context: DBSessionContext | None = None,
    ) -> None: ...


class InMemoryScoreCache:
    def __init__(self) -> None:
        self._store: dict[str, CachedScore] = {}

    async def get(self, *, team_id, model_version, payload_hash, db_session_context=None):
        return self._store.get(_cache_key(team_id, model_version, payload_hash))

    async def put(
        self, *, team_id, model_version, payload_hash, play_id, entry, db_session_context=None
    ):
        self._store[_cache_key(team_id, model_version, payload_hash)] = entry


class PostgresScoreCache:
    def __init__(self, db_manager: DatabaseSessionManager) -> None:
        self._db = db_manager

    async def get(self, *, team_id, model_version, payload_hash, db_session_context=None):
        async with self._db.scoped_connection(db_session_context) as connection:
            if connection is None:
                return None
            result = await connection.execute(
                text(
                    """
                    SELECT dci, dis, score_status, frame_scores
                    FROM ml.play_scores
                    WHERE team_id = :team_id
                      AND model_version = :model_version
                      AND payload_hash = :payload_hash
                    """
                ),
                {
                    "team_id": str(team_id),
                    "model_version": model_version,
                    "payload_hash": payload_hash,
                },
            )
            row = result.mappings().one_or_none()
        if row is None:
            return None
        frames = row["frame_scores"]
        if isinstance(frames, str):
            frames = json.loads(frames)
        return CachedScore(
            dci=row["dci"], dis=row["dis"], score_status=row["score_status"], frame_scores=frames
        )

    async def put(
        self, *, team_id, model_version, payload_hash, play_id, entry, db_session_context=None
    ):
        async with self._db.scoped_connection(db_session_context) as connection:
            if connection is None:
                return
            await connection.execute(
                text(
                    """
                    INSERT INTO ml.play_scores
                        (team_id, model_version, payload_hash, play_id, dci, dis,
                         score_status, frame_scores)
                    VALUES
                        (:team_id, :model_version, :payload_hash, :play_id, :dci, :dis,
                         :score_status, CAST(:frame_scores AS jsonb))
                    ON CONFLICT (team_id, model_version, payload_hash) DO UPDATE SET
                        play_id = EXCLUDED.play_id,
                        dci = EXCLUDED.dci,
                        dis = EXCLUDED.dis,
                        score_status = EXCLUDED.score_status,
                        frame_scores = EXCLUDED.frame_scores
                    """
                ),
                {
                    "team_id": str(team_id),
                    "model_version": model_version,
                    "payload_hash": payload_hash,
                    "play_id": play_id,
                    "dci": entry.dci,
                    "dis": entry.dis,
                    "score_status": entry.score_status,
                    "frame_scores": json.dumps(entry.frame_scores),
                },
            )


def _split_sql(ddl: str) -> list[str]:
    """Split a DDL script into executable statements.

    STOPGAP — correct ONLY for the controlled 0001_ml_play_scores.sql, NOT a general
    SQL splitter. It strips full-line ``--`` comments (so a ';' inside a comment can't
    create a bogus fragment), then splits on ';'. It will MISHANDLE: a ';' inside an
    inline trailing comment, a ';' inside a string literal, or block (``/* */``)
    comments. The current DDL contains none of these. If this DDL grows beyond simple
    CREATE/ALTER/DROP with no literal/inline-comment semicolons, replace this with a
    real migration runner (Alembic) or a SQL parser (sqlparse) before relying on it.
    """
    body = "\n".join(
        line for line in ddl.splitlines() if not line.lstrip().startswith("--")
    )
    return [stmt.strip() for stmt in body.split(";") if stmt.strip()]


async def ensure_schema(db_manager: DatabaseSessionManager) -> None:
    """Idempotently create ml.play_scores when a Postgres engine is configured."""
    if db_manager.engine is None:
        return
    statements = _split_sql(_DDL_PATH.read_text(encoding="utf-8"))
    async with db_manager.engine.begin() as connection:
        for statement in statements:
            await connection.execute(text(statement))


def build_score_cache(db_manager: DatabaseSessionManager) -> ScoreCache:
    if db_manager.engine is None:
        return InMemoryScoreCache()
    return PostgresScoreCache(db_manager)
