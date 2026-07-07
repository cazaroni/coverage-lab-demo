from __future__ import annotations

import pytest

from projectedge_analytics import AnalyticsReadNotFoundError, FixtureAnalyticsEngine
from projectedge_analytics._bridge_fixture import DEV_TEAM_ID, RIVAL_TEAM_ID


def test_fixture_engine_returns_play_detail_for_visible_play():
    engine = FixtureAnalyticsEngine()

    detail = engine.get_play_detail(play_id="pe_dev_0001", team_id=DEV_TEAM_ID)

    assert detail.play_id == "pe_dev_0001"
    assert detail.game_id == "2022090800"
    assert detail.team_id == DEV_TEAM_ID
    assert detail.season == 2022
    assert detail.week == 1
    assert detail.dataset_version == "v0.0.1"
    assert detail.model_version == "model-v0.0.1"


def test_fixture_engine_blocks_cross_team_play_access():
    engine = FixtureAnalyticsEngine()

    with pytest.raises(AnalyticsReadNotFoundError):
        engine.get_play_detail(play_id="pe_dev_0001", team_id=RIVAL_TEAM_ID)


def test_fixture_engine_returns_stable_distribution_and_explosive_matches():
    engine = FixtureAnalyticsEngine()

    distribution = engine.get_team_season_dci_distribution(team_id=DEV_TEAM_ID, season=2022)
    explosive = engine.search_explosive_plays(team_id=DEV_TEAM_ID, season=2022)

    assert [(point.bucket, point.count) for point in distribution] == [
        ("0.0-0.2", 0),
        ("0.2-0.4", 2),
        ("0.4-0.6", 4),
        ("0.6-0.8", 3),
        ("0.8-1.0", 3),
    ]
    assert [match.play_id for match in explosive[:3]] == [
        "pe_dev_0402",
        "pe_dev_0003",
        "pe_dev_0302",
    ]
    assert all(match.preceding_dis < 0.25 for match in explosive)


def test_fixture_engine_returns_rankings_and_dis_trend():
    engine = FixtureAnalyticsEngine()

    rankings = engine.rank_player_stress_resilience(team_id=DEV_TEAM_ID, season=2022)
    trend = engine.get_team_dis_trend(team_id=DEV_TEAM_ID, season=2022)

    assert [row.player_id for row in rankings[:3]] == [
        "dev_player_001",
        "dev_player_002",
        "dev_player_003",
    ]
    assert [point.week for point in trend] == [1, 2, 3, 4, 5]
    assert [point.dis_average for point in trend] == pytest.approx(
        [0.28, 0.28, 0.32, 0.24, 0.255]
    )
