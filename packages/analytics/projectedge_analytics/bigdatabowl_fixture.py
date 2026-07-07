from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from uuid import UUID


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_bigdatabowl_fixture_dir() -> Path:
    return _repo_root() / "packages" / "schemas" / "fixtures" / "datasets" / "bigdatabowl_2023"


def _parse_date(value: str) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def _parse_float(value: str) -> float | None:
    if value == "":
        return None
    return float(value)


def _parse_int(value: str) -> int | None:
    if value == "":
        return None
    return int(value)


@dataclass(frozen=True, slots=True)
class BigDataBowlTeamContext:
    team_context_id: UUID
    team_abbr: str
    team_name: str


@dataclass(frozen=True, slots=True)
class BigDataBowlGameRecord:
    team_context_id: UUID
    team_name: str
    team_abbr: str
    game_id: str
    season: int
    week: int
    observed_on: date | None
    home_team_abbr: str | None
    away_team_abbr: str | None
    home_score: int | None
    away_score: int | None
    play_count: int


@dataclass(frozen=True, slots=True)
class BigDataBowlPlayRecord:
    team_context_id: UUID
    team_name: str
    team_abbr: str
    play_id: str
    game_id: str
    raw_play_id: int
    season: int
    week: int
    game_date: date | None
    offense_team_abbr: str | None
    defense_team_abbr: str | None
    dci: float | None
    dis: float | None
    explosive_gain_yards: int | None
    expected_points_added: float | None
    pass_result: str | None
    play_description: str | None
    dataset_version: str
    model_version: str


@dataclass(frozen=True, slots=True)
class BigDataBowlResilienceRecord:
    team_context_id: UUID
    team_abbr: str
    player_id: str
    player_position: str
    nfl_id: int
    resilience_score: float
    samples: int
    season: int = 2023


@dataclass(frozen=True, slots=True)
class BigDataBowlMotionFrame:
    game_id: str
    play_id: str
    source_play_id: int
    frame_id: int
    nfl_id: int
    player_label: str
    player_side: str | None
    player_position: str | None
    x: float
    y: float
    node_stress: float
    frame_dci: float
    frame_dis: float


@dataclass(frozen=True, slots=True)
class PlayerNameEntry:
    display_name: str
    position: str
    jersey_number: int | None
    team_abbr: str | None


@dataclass(frozen=True, slots=True)
class BigDataBowlPlayerRecord:
    team_context_id: UUID
    team_abbr: str
    nfl_id: int
    player_id: str
    player_position: str
    player_side: str
    display_name: str


@dataclass(frozen=True, slots=True)
class BigDataBowlDriveRecord:
    team_context_id: UUID
    drive_id: str
    game_id: str
    possession_team: str
    defensive_team: str
    season: int
    week: int
    play_count: int
    play_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class BigDataBowlMotionSample:
    play_id: str
    game_id: str
    source_play_id: int
    focus_team_abbr: str
    title: str
    play_description: str
    path: str
    frame_count: int
    player_count: int


@dataclass(frozen=True, slots=True)
class BigDataBowlFixture:
    dataset_version: str
    model_version: str
    teams: tuple[BigDataBowlTeamContext, ...]
    games: tuple[BigDataBowlGameRecord, ...]
    plays: tuple[BigDataBowlPlayRecord, ...]
    resilience_rows: tuple[BigDataBowlResilienceRecord, ...]
    players: tuple[BigDataBowlPlayerRecord, ...]
    drives: tuple[BigDataBowlDriveRecord, ...]
    motion_samples: tuple[BigDataBowlMotionSample, ...]
    motion_frames_by_play: dict[str, tuple[BigDataBowlMotionFrame, ...]]
    player_names: dict[int, PlayerNameEntry]

    def team_for_context(self, team_id: UUID) -> BigDataBowlTeamContext | None:
        return next((team for team in self.teams if team.team_context_id == team_id), None)

    def games_for_team(
        self,
        team_id: UUID,
        *,
        season: int | None = None,
    ) -> tuple[BigDataBowlGameRecord, ...]:
        return tuple(
            game
            for game in self.games
            if game.team_context_id == team_id and (season is None or game.season == season)
        )

    def plays_for_team(
        self,
        team_id: UUID,
        *,
        season: int | None = None,
    ) -> tuple[BigDataBowlPlayRecord, ...]:
        return tuple(
            play
            for play in self.plays
            if play.team_context_id == team_id and (season is None or play.season == season)
        )

    def resilience_for_team(
        self,
        team_id: UUID,
        *,
        season: int | None = None,
    ) -> tuple[BigDataBowlResilienceRecord, ...]:
        return tuple(
            row
            for row in self.resilience_rows
            if row.team_context_id == team_id and (season is None or row.season == season)
        )

    def players_for_team(self, team_id: UUID) -> tuple[BigDataBowlPlayerRecord, ...]:
        return tuple(p for p in self.players if p.team_context_id == team_id)

    def drives_for_team(
        self,
        team_id: UUID,
        *,
        game_id: str | None = None,
        season: int | None = None,
    ) -> tuple[BigDataBowlDriveRecord, ...]:
        return tuple(
            d
            for d in self.drives
            if d.team_context_id == team_id
            and (game_id is None or d.game_id == game_id)
            and (season is None or d.season == season)
        )

    def drive_by_id(self, team_id: UUID, drive_id: str) -> BigDataBowlDriveRecord | None:
        return next(
            (d for d in self.drives if d.team_context_id == team_id and d.drive_id == drive_id),
            None,
        )

    def movement_for_play(
        self,
        team_id: UUID,
        *,
        play_id: str,
    ) -> tuple[BigDataBowlMotionFrame, ...]:
        play = next(
            (candidate for candidate in self.plays if candidate.team_context_id == team_id and candidate.play_id == play_id),
            None,
        )
        if play is None:
            return ()
        return self.motion_frames_by_play.get(play_id, ())


def _load_games(dataset_dir: Path) -> tuple[BigDataBowlGameRecord, ...]:
    rows: list[BigDataBowlGameRecord] = []
    with (dataset_dir / "games.csv").open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(
                BigDataBowlGameRecord(
                    team_context_id=UUID(row["team_context_id"]),
                    team_name=row["team_name"],
                    team_abbr=row["team_abbr"],
                    game_id=row["game_id"],
                    season=int(row["season"]),
                    week=int(row["week"]),
                    observed_on=_parse_date(row["observed_on"]),
                    home_team_abbr=row["home_team_abbr"] or None,
                    away_team_abbr=row["away_team_abbr"] or None,
                    home_score=_parse_int(row["home_score"]),
                    away_score=_parse_int(row["away_score"]),
                    play_count=int(row["play_count"]),
                )
            )
    return tuple(rows)


def _load_plays(dataset_dir: Path) -> tuple[BigDataBowlPlayRecord, ...]:
    rows: list[BigDataBowlPlayRecord] = []
    with (dataset_dir / "plays.csv").open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(
                BigDataBowlPlayRecord(
                    team_context_id=UUID(row["team_context_id"]),
                    team_name=row["team_name"],
                    team_abbr=row["team_abbr"],
                    play_id=row["play_id"],
                    game_id=row["game_id"],
                    raw_play_id=int(row["raw_play_id"]),
                    season=int(row["season"]),
                    week=int(row["week"]),
                    game_date=_parse_date(row["game_date_iso"]),
                    offense_team_abbr=row["offense_team_abbr"] or None,
                    defense_team_abbr=row["defense_team_abbr"] or None,
                    dci=_parse_float(row["dci"]),
                    dis=_parse_float(row["dis"]),
                    explosive_gain_yards=_parse_int(row["explosive_gain_yards"]),
                    expected_points_added=_parse_float(row["expected_points_added"]),
                    pass_result=row["pass_result"] or None,
                    play_description=row["play_description"] or None,
                    dataset_version=row["dataset_version"],
                    model_version=row["model_version"],
                )
            )
    return tuple(rows)


def _load_resilience_rows(dataset_dir: Path) -> tuple[BigDataBowlResilienceRecord, ...]:
    rows: list[BigDataBowlResilienceRecord] = []
    with (dataset_dir / "player_resilience.csv").open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(
                BigDataBowlResilienceRecord(
                    team_context_id=UUID(row["team_context_id"]),
                    team_abbr=row["team_abbr"],
                    player_id=row["player_id"],
                    player_position=row["player_position"],
                    nfl_id=int(row["nfl_id"]),
                    resilience_score=float(row["resilience_score"]),
                    samples=int(row["samples"]),
                )
            )
    return tuple(rows)


def load_player_names(dataset_dir: Path) -> dict[int, PlayerNameEntry]:
    lookup_path = dataset_dir / "player_names_lookup.json"
    if not lookup_path.exists():
        return {}
    raw = json.loads(lookup_path.read_text(encoding="utf-8"))
    result: dict[int, PlayerNameEntry] = {}
    for nfl_id_str, entry in raw.get("players", {}).items():
        result[int(nfl_id_str)] = PlayerNameEntry(
            display_name=entry["display_name"],
            position=entry["position"],
            jersey_number=entry.get("jersey_number"),
            team_abbr=entry.get("team_abbr"),
        )
    return result


def _load_players(
    dataset_dir: Path,
    player_names: dict[int, PlayerNameEntry],
) -> tuple[BigDataBowlPlayerRecord, ...]:
    players_path = dataset_dir / "players.csv"
    if not players_path.exists():
        return ()
    rows: list[BigDataBowlPlayerRecord] = []
    with players_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            nfl_id = int(row["nfl_id"])
            name_entry = player_names.get(nfl_id)
            display_name = name_entry.display_name if name_entry else row["player_id"]
            rows.append(
                BigDataBowlPlayerRecord(
                    team_context_id=UUID(row["team_context_id"]),
                    team_abbr=row["team_abbr"],
                    nfl_id=nfl_id,
                    player_id=row["player_id"],
                    player_position=row["player_position"],
                    player_side=row["player_side"],
                    display_name=display_name,
                )
            )
    return tuple(rows)


def _load_drives(dataset_dir: Path) -> tuple[BigDataBowlDriveRecord, ...]:
    import json as _json
    drives_path = dataset_dir / "drives.csv"
    if not drives_path.exists():
        return ()
    rows: list[BigDataBowlDriveRecord] = []
    with drives_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            play_ids = tuple(_json.loads(row["play_ids_json"]))
            rows.append(
                BigDataBowlDriveRecord(
                    team_context_id=UUID(row["team_context_id"]),
                    drive_id=row["drive_id"],
                    game_id=row["game_id"],
                    possession_team=row["possession_team"],
                    defensive_team=row["defensive_team"],
                    season=int(row["season"]),
                    week=int(row["week"]),
                    play_count=int(row["play_count"]),
                    play_ids=play_ids,
                )
            )
    return tuple(rows)


def _load_motion(dataset_dir: Path, manifest: dict[str, object]) -> tuple[tuple[BigDataBowlMotionSample, ...], dict[str, tuple[BigDataBowlMotionFrame, ...]]]:
    samples: list[BigDataBowlMotionSample] = []
    frames_by_play: dict[str, tuple[BigDataBowlMotionFrame, ...]] = {}
    for raw_sample in manifest.get("motion_samples", []):
        sample = BigDataBowlMotionSample(
            play_id=raw_sample["play_id"],
            game_id=raw_sample["game_id"],
            source_play_id=int(raw_sample["source_play_id"]),
            focus_team_abbr=raw_sample["focus_team_abbr"],
            title=raw_sample["title"],
            play_description=raw_sample["play_description"],
            path=raw_sample["path"],
            frame_count=int(raw_sample["frame_count"]),
            player_count=int(raw_sample["player_count"]),
        )
        samples.append(sample)
        rows: list[BigDataBowlMotionFrame] = []
        with (dataset_dir / sample.path).open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                rows.append(
                    BigDataBowlMotionFrame(
                        game_id=row["game_id"],
                        play_id=row["play_id"],
                        source_play_id=int(row["source_play_id"]),
                        frame_id=int(row["frame_id"]),
                        nfl_id=int(row["nfl_id"]),
                        player_label=row["player_label"],
                        player_side=row["player_side"] or None,
                        player_position=row["player_position"] or None,
                        x=float(row["x"]),
                        y=float(row["y"]),
                        node_stress=float(row["node_stress"]),
                        frame_dci=float(row["frame_dci"]),
                        frame_dis=float(row["frame_dis"]),
                    )
                )
        frames_by_play[sample.play_id] = tuple(rows)
    return tuple(samples), frames_by_play


@lru_cache(maxsize=8)
def load_bigdatabowl_fixture(dataset_dir: str | Path | None = None) -> BigDataBowlFixture:
    resolved_dir = Path(dataset_dir).resolve() if dataset_dir is not None else default_bigdatabowl_fixture_dir()
    manifest = json.loads((resolved_dir / "manifest.json").read_text(encoding="utf-8"))
    teams = tuple(
        BigDataBowlTeamContext(
            team_context_id=UUID(team["team_context_id"]),
            team_abbr=team["team_abbr"],
            team_name=team["team_name"],
        )
        for team in manifest["team_contexts"]
    )
    player_names = load_player_names(resolved_dir)
    motion_samples, motion_frames_by_play = _load_motion(resolved_dir, manifest)
    return BigDataBowlFixture(
        dataset_version=manifest["dataset_version"],
        model_version=manifest["model_version"],
        teams=teams,
        games=_load_games(resolved_dir),
        plays=_load_plays(resolved_dir),
        resilience_rows=_load_resilience_rows(resolved_dir),
        players=_load_players(resolved_dir, player_names),
        drives=_load_drives(resolved_dir),
        motion_samples=motion_samples,
        motion_frames_by_play=motion_frames_by_play,
        player_names=player_names,
    )
