from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_healthz_returns_ok_without_database():
    with TestClient(app) as client:
        response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "api"
    assert payload["status"] == "ok"
    assert payload["dependencies"][0]["name"] == "postgres"
    assert payload["dependencies"][0]["status"] == "skipped"


def test_session_returns_user_and_team_in_development_mode():
    with TestClient(app) as client:
        response = client.get("/session")

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["user_id"] == "user_dev_001"
    assert payload["team"]["team_id"] == "00000000-0000-0000-0000-000000000001"
    assert payload["team"]["role"] == "coach"
    assert payload["db_session_context_applied"] is False


def test_session_maps_playwright_team_alias_to_development_uuid():
    with TestClient(app) as client:
        response = client.get(
            "/session",
            headers={"x-projectedge-team-id": "team_springfield_arrows"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["team"]["team_id"] == "00000000-0000-0000-0000-000000000001"
