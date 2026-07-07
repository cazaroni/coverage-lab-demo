from __future__ import annotations

from app.config import get_settings
from app.db.context import normalize_database_url


def test_normalize_database_url_upgrades_heroku_postgres_scheme():
    assert normalize_database_url("postgres://user:pass@localhost:5432/projectedge") == (
        "postgresql+asyncpg://user:pass@localhost:5432/projectedge"
    )


def test_get_settings_accepts_heroku_database_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/projectedge")
    get_settings.cache_clear()

    try:
        settings = get_settings()
    finally:
        get_settings.cache_clear()

    assert settings.database_url == "postgres://user:pass@localhost:5432/projectedge"