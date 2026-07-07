from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from projectedge_analytics._bridge_fixture import DEV_TEAM_ID, RIVAL_TEAM_ID


def _team_headers(team_id: str) -> dict[str, str]:
    return {"x-projectedge-team-id": team_id}


def test_games_endpoint_returns_recent_games_for_active_team():
    with TestClient(app) as client:
        response = client.get("/games")

    assert response.status_code == 200
    payload = response.json()
    assert [game["game_id"] for game in payload] == [
        "2024010709",
        "2023123113",
        "2023122500",
        "2023121711",
        "2023121009",
    ]
    assert payload[0]["season"] == 2023
    assert payload[0]["away_team_abbr"] == "KC"
    assert payload[0]["play_count"] == 36


def test_games_endpoint_is_team_scoped():
    with TestClient(app) as client:
        response = client.get("/games", headers=_team_headers(str(RIVAL_TEAM_ID)))

    assert response.status_code == 200
    payload = response.json()
    assert [game["game_id"] for game in payload] == [
        "2024010712",
        "2023123111",
        "2023122407",
        "2023121801",
        "2023121008",
    ]
    assert "2024010709" not in {game["game_id"] for game in payload}


def test_catalog_plays_endpoint_returns_typed_rows_and_filters():
    with TestClient(app) as client:
        response = client.get("/catalog/plays", params={"game_id": "2023090700", "min_dci": 0.35})

    assert response.status_code == 200
    payload = response.json()
    assert [play["play_id"] for play in payload[:3]] == [
        "2023090700_3461",
        "2023090700_3114",
        "2023090700_1869",
    ]
    assert payload[0]["season"] == 2023
    assert payload[0]["week"] == 1
    assert payload[0]["offense_team_id"] == "DET"
    assert payload[0]["defense_team_id"] == "KC"
    assert payload[0]["thumbnail_url"] is None


def test_game_plays_endpoint_returns_typed_game_play_summaries():
    with TestClient(app) as client:
        response = client.get("/games/2023090700/plays")

    assert response.status_code == 200
    payload = response.json()
    assert [play["play_id"] for play in payload[:3]] == [
        "2023090700_101",
        "2023090700_361",
        "2023090700_436",
    ]
    assert payload[0]["game_id"] == "2023090700"
    assert payload[0]["offense_team_id"] == "DET"
    assert payload[0]["defense_team_id"] == "KC"


def test_play_detail_endpoint_blocks_cross_team_access():
    with TestClient(app) as client:
        response = client.get("/plays/2023090700_101")
        blocked_response = client.get(
            "/plays/2023090700_101",
            headers=_team_headers(str(RIVAL_TEAM_ID)),
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["team_id"] == str(DEV_TEAM_ID)
    assert payload["dataset_version"] == "bigdatabowl-2023-fixture-v1"
    assert payload["model_version"] == "dci-dis-supervised-v1"

    assert blocked_response.status_code == 404
    assert blocked_response.json()["detail"]["error_code"] == "not_found"


def test_dashboard_analytics_endpoints_return_expected_shapes():
    with TestClient(app) as client:
        distribution_response = client.get("/analytics/dci-distribution")
        explosive_response = client.get("/analytics/explosive-plays", params={"limit": 3})
        resilience_response = client.get(
            "/analytics/player-stress-resilience",
            params={"limit": 2},
        )
        trend_response = client.get("/analytics/dis-trend")

    assert distribution_response.status_code == 200
    # The 30 motion plays' dci/dis were regenerated from the geometric scorer
    # (surface unification, 2026-06); the other ~811 plays keep research values.
    assert distribution_response.json() == [
        {"bucket": "0.0-0.2", "count": 6},
        {"bucket": "0.2-0.4", "count": 367},
        {"bucket": "0.4-0.6", "count": 19},
        {"bucket": "0.6-0.8", "count": 1},
        {"bucket": "0.8-1.0", "count": 0},
    ]

    explosive_payload = explosive_response.json()
    assert explosive_response.status_code == 200
    assert [play["play_id"] for play in explosive_payload] == [
        "2023112608_99",
        "2023102209_613",
        "2023101200_3324",
    ]
    assert all(play["preceding_dis"] < 0.25 for play in explosive_payload)

    assert resilience_response.status_code == 200
    assert resilience_response.json() == [
        {
            "player_id": "DE #53887",
            "team_id": str(DEV_TEAM_ID),
            "resilience_score": 0.577884,
            "samples": 23,
        },
        {
            "player_id": "DT #52792",
            "team_id": str(DEV_TEAM_ID),
            "resilience_score": 0.538535,
            "samples": 109,
        },
    ]

    assert trend_response.status_code == 200
    trend_payload = trend_response.json()
    assert [point["week"] for point in trend_payload[:5]] == [1, 2, 3, 4, 5]
    assert [point["dis_average"] for point in trend_payload[:3]] == pytest.approx(
        [0.39713216, 0.441942, 0.41751946153846153]
    )
    assert [point["week"] for point in trend_payload[-3:]] == [16, 17, 18]
    assert [point["dis_average"] for point in trend_payload[-3:]] == pytest.approx(
        [0.4728023125, 0.45107542307692305, 0.3551013611111111]
    )


def test_play_movement_endpoint_returns_real_motion_sample():
    with TestClient(app) as client:
        response = client.get("/plays/2023090700_101/movement")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 100
    assert payload[0]["play_id"] == "2023090700_101"
    assert payload[0]["game_id"] == "2023090700"
    assert payload[0]["frame_id"] == 1
    assert payload[0]["player_label"] == "QB #43290"
    # frame_dci/frame_dis regenerated from the geometric scorer (surface
    # unification): frame_dci = 1 - mean(defense node_stress); first frame dis = 0.
    assert payload[0]["frame_dci"] == pytest.approx(0.243725)
    assert payload[0]["frame_dis"] == pytest.approx(0.0)
