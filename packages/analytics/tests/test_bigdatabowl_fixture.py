"""Tests for the BigDataBowl 2023 development fixture integrity and player names lookup."""
from __future__ import annotations

import uuid

import pytest

from projectedge_analytics.bigdatabowl_fixture import load_bigdatabowl_fixture

KC_TEAM_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
SEA_TEAM_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


@pytest.fixture(scope="module")
def fixture():
    return load_bigdatabowl_fixture()


def test_fixture_loads(fixture):
    assert fixture.dataset_version == "bigdatabowl-2023-fixture-v1"
    assert len(fixture.teams) == 2
    assert len(fixture.plays) > 800


def test_player_names_lookup_loaded(fixture):
    assert len(fixture.player_names) >= 48, "lookup should cover at least all roster players"


def test_player_display_names_not_placeholder(fixture):
    """At least the confirmed players should have real names (not 'POS #id' format)."""
    confirmed_ids = {43290, 44930, 38605, 55869}  # Jared Goff, Josh Reynolds, Stafford, Witherspoon
    lookup = fixture.player_names
    for nfl_id in confirmed_ids:
        if nfl_id in lookup:
            name = lookup[nfl_id].display_name
            assert "#" not in name or not name.startswith(("QB", "WR", "CB", "DE")), (
                f"nfl_id {nfl_id} still has placeholder display_name: {name!r}"
            )


def test_roster_players_have_display_names(fixture):
    for p in fixture.players:
        assert p.display_name, f"nfl_id {p.nfl_id} has empty display_name"
        assert len(p.display_name) > 1, f"nfl_id {p.nfl_id} display_name too short"


def test_drives_cross_ref(fixture):
    """Every play_id referenced in drives must exist in plays."""
    play_ids = {p.play_id for p in fixture.plays}
    missing = []
    for drive in fixture.drives:
        for pid in drive.play_ids:
            if pid not in play_ids:
                missing.append((drive.drive_id, pid))
    assert not missing, (
        f"drives.csv references {len(missing)} play_ids not in plays.csv: {missing[:5]}"
    )


def test_drives_exist(fixture):
    assert len(fixture.drives) >= 100, "expected at least 100 drives in the fixture"


def test_motion_samples_count(fixture):
    assert len(fixture.motion_samples) >= 30, (
        f"expected at least 30 motion samples, got {len(fixture.motion_samples)}"
    )


def test_motion_samples_cover_both_teams(fixture):
    teams = {s.focus_team_abbr for s in fixture.motion_samples}
    assert "KC" in teams
    assert "SEA" in teams


def test_motion_samples_dci_variety(fixture):
    """Motion samples should include collapse-grade, stressed, and stable plays for
    timeline variety. Thresholds match the unified geometric scorer's distribution
    (surface unification 2026-06-25): the fixture's 30 motion plays land at
    3 collapse-grade (<0.30), a ~0.33 stressed cluster, and a ~0.57 stable cluster."""
    play_dci = {p.play_id: p.dci for p in fixture.plays}
    sample_dcis = [play_dci[s.play_id] for s in fixture.motion_samples if s.play_id in play_dci and play_dci[s.play_id] is not None]
    low = [d for d in sample_dcis if d < 0.3]
    mid = [d for d in sample_dcis if 0.3 <= d < 0.4]
    high = [d for d in sample_dcis if d >= 0.4]
    assert len(low) >= 3, f"need ≥3 collapse-grade samples for the collapse timeline, got {len(low)}"
    assert len(mid) >= 5, f"need ≥5 stressed samples, got {len(mid)}"
    assert len(high) >= 5, f"need ≥5 stable samples for the stable timeline, got {len(high)}"


def test_motion_frames_load_for_all_samples(fixture):
    """Every motion_sample entry should have frame data in motion_frames_by_play."""
    missing = [s.play_id for s in fixture.motion_samples if s.play_id not in fixture.motion_frames_by_play]
    assert not missing, f"{len(missing)} motion samples have no frame data: {missing[:3]}"


def test_motion_frames_have_valid_positions(fixture):
    """Spot-check first sample's frames: x in [0,100], y in [0,53.3]."""
    sample = fixture.motion_samples[0]
    frames = fixture.motion_frames_by_play[sample.play_id]
    for frame in frames[:10]:
        assert 0 <= frame.x <= 100, f"x out of range: {frame.x}"
        assert 0 <= frame.y <= 53.3, f"y out of range: {frame.y}"
        assert 0 <= frame.node_stress <= 1, f"node_stress out of range: {frame.node_stress}"
