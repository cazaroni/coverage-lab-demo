from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from uuid import UUID


DEV_TEAM_ID = UUID("00000000-0000-0000-0000-000000000001")
RIVAL_TEAM_ID = UUID("00000000-0000-0000-0000-000000000002")

KC_TEAM_ID = UUID("10000000-0000-0000-0000-000000000001")
NYJ_TEAM_ID = UUID("10000000-0000-0000-0000-000000000002")
MIA_TEAM_ID = UUID("10000000-0000-0000-0000-000000000003")
NE_TEAM_ID = UUID("10000000-0000-0000-0000-000000000004")
DAL_TEAM_ID = UUID("10000000-0000-0000-0000-000000000005")
PHI_TEAM_ID = UUID("10000000-0000-0000-0000-000000000006")
SF_TEAM_ID = UUID("10000000-0000-0000-0000-000000000007")
BUF_TEAM_ID = UUID("10000000-0000-0000-0000-000000000008")


@dataclass(frozen=True, slots=True)
class BridgeGameRecord:
    team_id: UUID
    game_id: str
    season: int
    week: int
    observed_on: date
    home_team_abbr: str | None
    away_team_abbr: str | None
    home_score: int | None
    away_score: int | None
    play_count: int


@dataclass(frozen=True, slots=True)
class BridgePlayRecord:
    team_id: UUID
    play_id: str
    game_id: str
    season: int
    week: int
    sequence: int
    offense_team_id: UUID | None
    defense_team_id: UUID | None
    offense_team_abbr: str | None
    defense_team_abbr: str | None
    dci: float | None
    dis: float | None
    explosive_gain_yards: int | None = None
    thumbnail_url: str | None = None
    dataset_version: str | None = "v0.0.1"
    model_version: str | None = "model-v0.0.1"


@dataclass(frozen=True, slots=True)
class BridgeStressResilienceRecord:
    player_id: str
    team_id: UUID
    season: int
    resilience_score: float
    samples: int


@dataclass(frozen=True, slots=True)
class Phase1BridgeFixture:
    """Deterministic Phase 1 bridge corpus until lake-backed fixtures land."""

    games: tuple[BridgeGameRecord, ...]
    plays: tuple[BridgePlayRecord, ...]
    resilience_rows: tuple[BridgeStressResilienceRecord, ...]

    def games_for_team(self, team_id: UUID, *, season: int | None = None) -> tuple[BridgeGameRecord, ...]:
        return tuple(
            game
            for game in self.games
            if game.team_id == team_id and (season is None or game.season == season)
        )

    def plays_for_team(self, team_id: UUID, *, season: int | None = None) -> tuple[BridgePlayRecord, ...]:
        return tuple(
            play
            for play in self.plays
            if play.team_id == team_id and (season is None or play.season == season)
        )

    def resilience_for_team(
        self, team_id: UUID, *, season: int | None = None
    ) -> tuple[BridgeStressResilienceRecord, ...]:
        return tuple(
            row
            for row in self.resilience_rows
            if row.team_id == team_id and (season is None or row.season == season)
        )


@lru_cache(maxsize=1)
def default_phase1_bridge_fixture() -> Phase1BridgeFixture:
    return Phase1BridgeFixture(
        games=(
            BridgeGameRecord(
                team_id=DEV_TEAM_ID,
                game_id="2022090800",
                season=2022,
                week=1,
                observed_on=date(2022, 9, 8),
                home_team_abbr="DEV",
                away_team_abbr="BUF",
                home_score=27,
                away_score=17,
                play_count=63,
            ),
            BridgeGameRecord(
                team_id=DEV_TEAM_ID,
                game_id="2022091500",
                season=2022,
                week=2,
                observed_on=date(2022, 9, 15),
                home_team_abbr="KC",
                away_team_abbr="DEV",
                home_score=24,
                away_score=20,
                play_count=58,
            ),
            BridgeGameRecord(
                team_id=DEV_TEAM_ID,
                game_id="2022092200",
                season=2022,
                week=3,
                observed_on=date(2022, 9, 22),
                home_team_abbr="DEV",
                away_team_abbr="NYJ",
                home_score=31,
                away_score=14,
                play_count=61,
            ),
            BridgeGameRecord(
                team_id=DEV_TEAM_ID,
                game_id="2022092900",
                season=2022,
                week=4,
                observed_on=date(2022, 9, 29),
                home_team_abbr="MIA",
                away_team_abbr="DEV",
                home_score=28,
                away_score=24,
                play_count=55,
            ),
            BridgeGameRecord(
                team_id=DEV_TEAM_ID,
                game_id="2022100600",
                season=2022,
                week=5,
                observed_on=date(2022, 10, 6),
                home_team_abbr="DEV",
                away_team_abbr="NE",
                home_score=35,
                away_score=13,
                play_count=66,
            ),
            BridgeGameRecord(
                team_id=RIVAL_TEAM_ID,
                game_id="2022091101",
                season=2022,
                week=1,
                observed_on=date(2022, 9, 11),
                home_team_abbr="DAL",
                away_team_abbr="PHI",
                home_score=17,
                away_score=21,
                play_count=52,
            ),
            BridgeGameRecord(
                team_id=RIVAL_TEAM_ID,
                game_id="2022091801",
                season=2022,
                week=2,
                observed_on=date(2022, 9, 18),
                home_team_abbr="SF",
                away_team_abbr="DAL",
                home_score=14,
                away_score=10,
                play_count=49,
            ),
        ),
        plays=(
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0001",
                game_id="2022090800",
                season=2022,
                week=1,
                sequence=1,
                offense_team_id=DEV_TEAM_ID,
                defense_team_id=BUF_TEAM_ID,
                offense_team_abbr="DEV",
                defense_team_abbr="BUF",
                dci=0.82,
                dis=0.41,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0002",
                game_id="2022090800",
                season=2022,
                week=1,
                sequence=2,
                offense_team_id=BUF_TEAM_ID,
                defense_team_id=DEV_TEAM_ID,
                offense_team_abbr="BUF",
                defense_team_abbr="DEV",
                dci=0.67,
                dis=0.24,
                explosive_gain_yards=28,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0003",
                game_id="2022090800",
                season=2022,
                week=1,
                sequence=3,
                offense_team_id=DEV_TEAM_ID,
                defense_team_id=BUF_TEAM_ID,
                offense_team_abbr="DEV",
                defense_team_abbr="BUF",
                dci=0.91,
                dis=0.19,
                explosive_gain_yards=35,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0101",
                game_id="2022091500",
                season=2022,
                week=2,
                sequence=1,
                offense_team_id=DEV_TEAM_ID,
                defense_team_id=KC_TEAM_ID,
                offense_team_abbr="DEV",
                defense_team_abbr="KC",
                dci=0.58,
                dis=0.34,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0102",
                game_id="2022091500",
                season=2022,
                week=2,
                sequence=2,
                offense_team_id=KC_TEAM_ID,
                defense_team_id=DEV_TEAM_ID,
                offense_team_abbr="KC",
                defense_team_abbr="DEV",
                dci=0.44,
                dis=0.22,
                explosive_gain_yards=18,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0201",
                game_id="2022092200",
                season=2022,
                week=3,
                sequence=1,
                offense_team_id=DEV_TEAM_ID,
                defense_team_id=NYJ_TEAM_ID,
                offense_team_abbr="DEV",
                defense_team_abbr="NYJ",
                dci=0.73,
                dis=0.48,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0202",
                game_id="2022092200",
                season=2022,
                week=3,
                sequence=2,
                offense_team_id=NYJ_TEAM_ID,
                defense_team_id=DEV_TEAM_ID,
                offense_team_abbr="NYJ",
                defense_team_abbr="DEV",
                dci=0.63,
                dis=0.27,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0203",
                game_id="2022092200",
                season=2022,
                week=3,
                sequence=3,
                offense_team_id=DEV_TEAM_ID,
                defense_team_id=NYJ_TEAM_ID,
                offense_team_abbr="DEV",
                defense_team_abbr="NYJ",
                dci=0.37,
                dis=0.21,
                explosive_gain_yards=24,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0301",
                game_id="2022092900",
                season=2022,
                week=4,
                sequence=1,
                offense_team_id=MIA_TEAM_ID,
                defense_team_id=DEV_TEAM_ID,
                offense_team_abbr="MIA",
                defense_team_abbr="DEV",
                dci=0.29,
                dis=0.31,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0302",
                game_id="2022092900",
                season=2022,
                week=4,
                sequence=2,
                offense_team_id=DEV_TEAM_ID,
                defense_team_id=MIA_TEAM_ID,
                offense_team_abbr="DEV",
                defense_team_abbr="MIA",
                dci=0.52,
                dis=0.17,
                explosive_gain_yards=31,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0401",
                game_id="2022100600",
                season=2022,
                week=5,
                sequence=1,
                offense_team_id=NE_TEAM_ID,
                defense_team_id=DEV_TEAM_ID,
                offense_team_abbr="NE",
                defense_team_abbr="DEV",
                dci=0.47,
                dis=0.28,
            ),
            BridgePlayRecord(
                team_id=DEV_TEAM_ID,
                play_id="pe_dev_0402",
                game_id="2022100600",
                season=2022,
                week=5,
                sequence=2,
                offense_team_id=DEV_TEAM_ID,
                defense_team_id=NE_TEAM_ID,
                offense_team_abbr="DEV",
                defense_team_abbr="NE",
                dci=0.84,
                dis=0.23,
                explosive_gain_yards=42,
            ),
            BridgePlayRecord(
                team_id=RIVAL_TEAM_ID,
                play_id="pe_rival_0001",
                game_id="2022091101",
                season=2022,
                week=1,
                sequence=1,
                offense_team_id=DAL_TEAM_ID,
                defense_team_id=PHI_TEAM_ID,
                offense_team_abbr="DAL",
                defense_team_abbr="PHI",
                dci=0.61,
                dis=0.29,
            ),
            BridgePlayRecord(
                team_id=RIVAL_TEAM_ID,
                play_id="pe_rival_0002",
                game_id="2022091101",
                season=2022,
                week=1,
                sequence=2,
                offense_team_id=PHI_TEAM_ID,
                defense_team_id=DAL_TEAM_ID,
                offense_team_abbr="PHI",
                defense_team_abbr="DAL",
                dci=0.48,
                dis=0.18,
                explosive_gain_yards=19,
            ),
            BridgePlayRecord(
                team_id=RIVAL_TEAM_ID,
                play_id="pe_rival_0101",
                game_id="2022091801",
                season=2022,
                week=2,
                sequence=1,
                offense_team_id=SF_TEAM_ID,
                defense_team_id=DAL_TEAM_ID,
                offense_team_abbr="SF",
                defense_team_abbr="DAL",
                dci=0.54,
                dis=0.33,
            ),
            BridgePlayRecord(
                team_id=RIVAL_TEAM_ID,
                play_id="pe_rival_0102",
                game_id="2022091801",
                season=2022,
                week=2,
                sequence=2,
                offense_team_id=DAL_TEAM_ID,
                defense_team_id=SF_TEAM_ID,
                offense_team_abbr="DAL",
                defense_team_abbr="SF",
                dci=0.72,
                dis=0.21,
                explosive_gain_yards=27,
            ),
        ),
        resilience_rows=(
            BridgeStressResilienceRecord(
                player_id="dev_player_001",
                team_id=DEV_TEAM_ID,
                season=2022,
                resilience_score=0.91,
                samples=34,
            ),
            BridgeStressResilienceRecord(
                player_id="dev_player_002",
                team_id=DEV_TEAM_ID,
                season=2022,
                resilience_score=0.87,
                samples=41,
            ),
            BridgeStressResilienceRecord(
                player_id="dev_player_003",
                team_id=DEV_TEAM_ID,
                season=2022,
                resilience_score=0.81,
                samples=29,
            ),
            BridgeStressResilienceRecord(
                player_id="dev_player_004",
                team_id=DEV_TEAM_ID,
                season=2022,
                resilience_score=0.76,
                samples=18,
            ),
            BridgeStressResilienceRecord(
                player_id="dev_player_005",
                team_id=DEV_TEAM_ID,
                season=2022,
                resilience_score=0.69,
                samples=22,
            ),
            BridgeStressResilienceRecord(
                player_id="rival_player_001",
                team_id=RIVAL_TEAM_ID,
                season=2022,
                resilience_score=0.79,
                samples=31,
            ),
            BridgeStressResilienceRecord(
                player_id="rival_player_002",
                team_id=RIVAL_TEAM_ID,
                season=2022,
                resilience_score=0.71,
                samples=24,
            ),
        ),
    )
