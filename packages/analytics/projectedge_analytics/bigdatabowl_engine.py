from __future__ import annotations

from dataclasses import dataclass, field
from statistics import mean
from uuid import UUID

from .bigdatabowl_fixture import (
    BigDataBowlFixture,
    BigDataBowlMotionFrame,
    BigDataBowlPlayRecord,
    load_bigdatabowl_fixture,
)
from .errors import AnalyticsReadNotFoundError
from .models import (
    DriveMovementFrame,
    DrivePlayClip,
    DriveSummary,
    ExplosivePlayMatch,
    GamePlaySummary,
    PlayDetail,
    PlayMovementFrame,
    PlayerHeadlineMetrics,
    PlayerIdentity,
    PlayerProfile,
    PlayerStressEvent,
    PlayerStressResilienceRow,
    PlayerTrendPoint,
    CollapseWindow,
    PlayForensics,
    RosterPlayer,
    TeamDCIDistributionPoint,
    TeamDISTrendPoint,
    TeamIntegrityPoint,
)


def _bucket_for_dci(dci: float) -> str:
    if dci < 0.2:
        return "0.0-0.2"
    if dci < 0.4:
        return "0.2-0.4"
    if dci < 0.6:
        return "0.4-0.6"
    if dci < 0.8:
        return "0.6-0.8"
    return "0.8-1.0"


@dataclass(slots=True)
class BigDataBowlAnalyticsEngine:
    dataset_dir: str | None = None
    dataset: BigDataBowlFixture = field(init=False)
    engine_name: str = "bigdatabowl-fixture"

    def __post_init__(self) -> None:
        self.dataset = load_bigdatabowl_fixture(self.dataset_dir)

    def _team_plays(self, *, team_id: UUID, season: int | None = None) -> tuple[BigDataBowlPlayRecord, ...]:
        return self.dataset.plays_for_team(team_id, season=season)

    def _find_play(self, *, play_id: str, team_id: UUID) -> BigDataBowlPlayRecord:
        for play in self._team_plays(team_id=team_id):
            if play.play_id == play_id:
                return play
        raise AnalyticsReadNotFoundError(f"Play '{play_id}' was not found for the active team.")

    def get_play_detail(self, *, play_id: str, team_id: UUID) -> PlayDetail:
        play = self._find_play(play_id=play_id, team_id=team_id)
        return PlayDetail(
            play_id=play.play_id,
            game_id=play.game_id,
            team_id=team_id,
            season=play.season,
            week=play.week,
            dci=play.dci,
            dis=play.dis,
            dataset_version=play.dataset_version or self.dataset.dataset_version,
            model_version=play.model_version or self.dataset.model_version,
        )

    def list_game_plays(self, *, game_id: str, team_id: UUID) -> list[GamePlaySummary]:
        plays = [play for play in self._team_plays(team_id=team_id) if play.game_id == game_id]
        if not plays:
            raise AnalyticsReadNotFoundError(f"Game '{game_id}' was not found for the active team.")

        plays.sort(key=lambda play: play.raw_play_id)
        return [
            GamePlaySummary(
                play_id=play.play_id,
                game_id=play.game_id,
                offense_team_id=play.offense_team_abbr,
                defense_team_id=play.defense_team_abbr,
                dci=play.dci,
                dis=play.dis,
            )
            for play in plays
        ]

    def get_team_season_dci_distribution(
        self,
        *,
        team_id: UUID,
        season: int,
    ) -> list[TeamDCIDistributionPoint]:
        counts = {
            "0.0-0.2": 0,
            "0.2-0.4": 0,
            "0.4-0.6": 0,
            "0.6-0.8": 0,
            "0.8-1.0": 0,
        }

        for play in self._team_plays(team_id=team_id, season=season):
            if play.dci is None:
                continue
            counts[_bucket_for_dci(play.dci)] += 1

        return [
            TeamDCIDistributionPoint(bucket=bucket, count=count)
            for bucket, count in counts.items()
        ]

    def search_explosive_plays(self, *, team_id: UUID, season: int) -> list[ExplosivePlayMatch]:
        matches = [
            play
            for play in self._team_plays(team_id=team_id, season=season)
            if play.dis is not None
            and play.dis < 0.25
            and play.explosive_gain_yards is not None
        ]
        matches.sort(
            key=lambda play: (play.dis or 1.0, -(play.explosive_gain_yards or 0), play.play_id)
        )
        return [
            ExplosivePlayMatch(
                play_id=play.play_id,
                game_id=play.game_id,
                preceding_dis=play.dis or 0.0,
                explosive_gain_yards=play.explosive_gain_yards,
            )
            for play in matches
        ]

    def rank_player_stress_resilience(
        self,
        *,
        team_id: UUID,
        season: int,
    ) -> list[PlayerStressResilienceRow]:
        rows = list(self.dataset.resilience_for_team(team_id, season=season))
        rows.sort(key=lambda row: (-row.resilience_score, -row.samples, row.player_id))
        return [
            PlayerStressResilienceRow(
                player_id=row.player_id,
                team_id=team_id,
                resilience_score=row.resilience_score,
                samples=row.samples,
            )
            for row in rows
        ]

    def get_team_dis_trend(self, *, team_id: UUID, season: int) -> list[TeamDISTrendPoint]:
        plays = self._team_plays(team_id=team_id, season=season)
        games_by_week = {
            game.week: game for game in self.dataset.games_for_team(team_id, season=season)
        }
        dis_by_week: dict[int, list[float]] = {}
        for play in plays:
            if play.dis is None:
                continue
            dis_by_week.setdefault(play.week, []).append(play.dis)

        return [
            TeamDISTrendPoint(
                team_id=team_id,
                week=week,
                observed_on=games_by_week.get(week).observed_on if week in games_by_week else None,
                dis_average=mean(values),
            )
            for week, values in sorted(dis_by_week.items())
        ]

    def list_play_movement(self, *, play_id: str, team_id: UUID) -> list[PlayMovementFrame]:
        self._find_play(play_id=play_id, team_id=team_id)

        frames: tuple[BigDataBowlMotionFrame, ...] = self.dataset.movement_for_play(
            team_id,
            play_id=play_id,
        )
        if not frames:
            raise AnalyticsReadNotFoundError(
                f"Movement sample for play '{play_id}' is not available for the active team."
            )

        return [
            PlayMovementFrame(
                play_id=frame.play_id,
                game_id=frame.game_id,
                source_play_id=frame.source_play_id,
                frame_id=frame.frame_id,
                nfl_id=frame.nfl_id,
                player_label=frame.player_label,
                player_position=frame.player_position or "",
                player_side=frame.player_side or "",
                x=frame.x,
                y=frame.y,
                s=0.0,
                o=0.0,
                dir=0.0,
                node_stress=frame.node_stress,
                frame_dci=frame.frame_dci,
                frame_dis=frame.frame_dis,
            )
            for frame in frames
        ]

    # ─── Player Profile ────────────────────────────────────────────────────────

    def search_players(self, *, team_id: UUID, q: str, limit: int = 10) -> list[PlayerIdentity]:
        players = self.dataset.players_for_team(team_id)
        q_stripped = q.strip()
        q_lower = q_stripped.lower()
        team_record = self.dataset.team_for_context(team_id)
        team_abbr = team_record.team_abbr if team_record else str(team_id)

        if not q_stripped:
            return [
                PlayerIdentity(
                    nfl_id=p.nfl_id,
                    display_name=p.display_name,
                    position=p.player_position,
                    team_id=team_abbr,
                )
                for p in players[:limit]
            ]

        matches = [
            p for p in players
            if q_lower in p.display_name.lower()
            or q_lower in p.player_id.lower()
            or q_lower in p.player_position.lower()
            or q_stripped == str(p.nfl_id)
        ]
        return [
            PlayerIdentity(
                nfl_id=p.nfl_id,
                display_name=p.display_name,
                position=p.player_position,
                team_id=team_abbr,
            )
            for p in matches[:limit]
        ]

    def list_roster_players(self, *, team_id: UUID, season: int) -> list[RosterPlayer]:
        players = self.dataset.players_for_team(team_id)
        resilience_by_nfl = {
            r.nfl_id: r
            for r in self.dataset.resilience_for_team(team_id)
        }
        team_record = self.dataset.team_for_context(team_id)
        team_abbr = team_record.team_abbr if team_record else str(team_id)

        plays = self._team_plays(team_id=team_id, season=season)
        game_ids = {p.game_id for p in plays}

        result: list[RosterPlayer] = []
        for p in players:
            res = resilience_by_nfl.get(p.nfl_id)
            resilience_score = res.resilience_score if res else 0.5
            samples = res.samples if res else 0
            avg_stress = max(0.0, min(1.0, 1.0 - resilience_score))
            games_tracked = min(len(game_ids), max(1, samples // 25))
            result.append(
                RosterPlayer(
                    nfl_id=p.nfl_id,
                    player_id=p.player_id,
                    display_name=p.display_name,
                    position=p.player_position,
                    player_side=p.player_side,
                    team_id=team_abbr,
                    avg_node_stress=round(avg_stress, 4),
                    avg_dci_while_on_field=None,
                    avg_dis_while_on_field=None,
                    plays_tracked=samples,
                    games_tracked=games_tracked,
                    resilience_score=resilience_score,
                )
            )
        result.sort(key=lambda r: (-r.resilience_score, r.player_id))
        return result

    def get_player_profile(self, *, team_id: UUID, nfl_id: int, season: int) -> PlayerProfile:
        players = self.dataset.players_for_team(team_id)
        player = next((p for p in players if p.nfl_id == nfl_id), None)
        if player is None:
            raise AnalyticsReadNotFoundError(
                f"Player nfl_id={nfl_id} was not found for the active team."
            )

        resilience_by_nfl = {r.nfl_id: r for r in self.dataset.resilience_for_team(team_id)}
        res = resilience_by_nfl.get(nfl_id)
        resilience_score = res.resilience_score if res else 0.5
        samples = res.samples if res else 0

        team_record = self.dataset.team_for_context(team_id)
        team_abbr = team_record.team_abbr if team_record else str(team_id)

        avg_stress = max(0.0, min(1.0, 1.0 - resilience_score))

        # Build per-week trend from team DIS trend as proxy
        plays = self._team_plays(team_id=team_id, season=season)
        games_by_week = {
            game.week: game for game in self.dataset.games_for_team(team_id, season=season)
        }
        dis_by_week: dict[int, list[float]] = {}
        for play in plays:
            if play.dis is not None:
                dis_by_week.setdefault(play.week, []).append(play.dis)

        trend: list[PlayerTrendPoint] = []
        for week, dis_values in sorted(dis_by_week.items()):
            game = games_by_week.get(week)
            week_stress = max(0.0, min(1.0, avg_stress * (sum(dis_values) / len(dis_values)) * 2.5))
            trend.append(PlayerTrendPoint(
                week=week,
                avg_node_stress=round(week_stress, 4),
                game_id=game.game_id if game else None,
            ))

        # Top stress events: find plays with worst DIS and link to them
        high_dis_plays = sorted(
            [p for p in plays if p.dis is not None],
            key=lambda p: (-(p.dis or 0.0), p.play_id),
        )[:5]
        top_stress_events = [
            PlayerStressEvent(
                play_id=p.play_id,
                game_id=p.game_id,
                week=p.week,
                node_stress=round(max(0.0, min(1.0, avg_stress * (p.dis or 0.5) * 2.0)), 4),
                dci=p.dci,
                dis=p.dis,
            )
            for p in high_dis_plays
        ]

        plays_tracked = samples
        games_tracked = min(len({p.game_id for p in plays}), max(1, samples // 25))

        return PlayerProfile(
            identity=PlayerIdentity(
                nfl_id=nfl_id,
                display_name=player.player_id,
                position=player.player_position,
                team_id=team_abbr,
            ),
            headline=PlayerHeadlineMetrics(
                avg_node_stress=round(avg_stress, 4),
                avg_dci_while_on_field=None,
                avg_dis_while_on_field=None,
                plays_tracked=plays_tracked,
                games_tracked=games_tracked,
            ),
            trend=trend,
            top_stress_events=top_stress_events,
        )

    # ─── Forensics ────────────────────────────────────────────────────────────

    def get_play_forensics(self, *, play_id: str, team_id: UUID) -> PlayForensics:
        play = next(
            (p for p in self.dataset.plays if p.team_context_id == team_id and p.play_id == play_id),
            None,
        )
        if play is None:
            raise AnalyticsReadNotFoundError(f"play {play_id!r} not found for team {team_id}")

        frames = self.dataset.motion_frames_by_play.get(play_id, ())
        dci = play.dci or 0.0
        dis = play.dis or 0.0
        model_version = play.model_version or "dci-dis-supervised-v1"

        # Per-frame aggregate DCI: 1 - mean(node_stress per frame)
        frame_ids = sorted({f.frame_id for f in frames})
        frame_agg: list[tuple[int, float, list[str]]] = []
        for fid in frame_ids:
            fgroup = [f for f in frames if f.frame_id == fid and f.player_side == "Defense"]
            if not fgroup:
                continue
            agg_dci = max(0.0, min(1.0, 1.0 - mean(f.node_stress for f in fgroup)))
            entities = [str(f.nfl_id) for f in fgroup]
            frame_agg.append((fid, agg_dci, entities))

        # Peak stress frame: lowest aggregate DCI
        if frame_agg:
            peak_frame, _, peak_entities = min(frame_agg, key=lambda t: t[1])
            # Peak stress entity: highest individual node_stress in peak frame
            peak_group = [f for f in frames if f.frame_id == peak_frame and f.player_side == "Defense"]
            peak_entity = max(peak_group, key=lambda f: f.node_stress, default=None)
            peak_entity_id = str(peak_entity.nfl_id) if peak_entity else "unknown"
            peak_stress_value = round(peak_entity.node_stress, 4) if peak_entity else 0.0
        else:
            # No motion sample -> no per-frame peak. Null rather than fabricated zeros.
            peak_frame = None
            peak_entity_id = None
            peak_stress_value = None

        # Collapse window: longest consecutive run of frames where agg DCI < 0.5 (min 5 frames)
        collapse_window: CollapseWindow | None = None
        if frame_agg:
            threshold = 0.5
            min_run = 5
            best_run: list[int] = []
            current_run: list[int] = []
            for fid, agg_dci, _ in frame_agg:
                if agg_dci < threshold:
                    current_run.append(fid)
                else:
                    if len(current_run) >= min_run and len(current_run) > len(best_run):
                        best_run = current_run[:]
                    current_run = []
            if len(current_run) >= min_run and len(current_run) > len(best_run):
                best_run = current_run
            if best_run:
                collapse_window = CollapseWindow(start_frame=best_run[0], end_frame=best_run[-1])

        # Plain-text summary
        archetype_label = getattr(play, "archetype_label", None) or "Unclassified"
        if not frame_agg:
            # No tracking sample -> headline scores only. Do NOT fabricate a
            # frame-by-frame story (no peak frame, no collapse window).
            summary = (
                f"No tracking sample is on file for this play, so only the headline scores are "
                f"known (DCI {dci:.2f} | DIS {dis:.2f}). A frame-by-frame breakdown — peak stress, "
                f"collapse window — is available only for plays that have motion data."
            )
        elif collapse_window:
            summary = (
                f"The defensive shell held formation through the first {collapse_window.start_frame} frames, "
                f"then structural drift opened between frames {collapse_window.start_frame} and {collapse_window.end_frame}. "
                f"Nearest archetype: {archetype_label}. "
                f"DCI {dci:.2f} | DIS {dis:.2f}."
            )
        else:
            summary = (
                f"The defensive shell maintained structural integrity throughout the play. "
                f"Archetype match: {archetype_label}. "
                f"DCI {dci:.2f} | DIS {dis:.2f}."
            )

        return PlayForensics(
            play_id=play_id,
            team_id=str(team_id),
            dci=round(dci, 4),
            dis=round(dis, 4),
            model_version=model_version,
            archetype_label=archetype_label,
            has_motion=bool(frame_agg),
            peak_stress_frame=peak_frame,
            peak_stress_entity_id=peak_entity_id,
            peak_stress_value=peak_stress_value,
            collapse_window=collapse_window,
            plain_text_summary=summary,
        )

    def get_team_integrity_trends(self, *, team_id: UUID, season: int) -> list[TeamIntegrityPoint]:
        plays = self._team_plays(team_id=team_id, season=season)
        by_week: dict[int, list[tuple[float, float]]] = {}
        for p in plays:
            if p.dci is None or p.dis is None:
                continue
            by_week.setdefault(p.week, []).append((p.dci, p.dis))
        result = []
        for week in sorted(by_week):
            pairs = by_week[week]
            result.append(TeamIntegrityPoint(
                week=week,
                avg_dci=round(mean(d for d, _ in pairs), 4),
                avg_dis=round(mean(d for _, d in pairs), 4),
                play_count=len(pairs),
            ))
        return result

    # ─── Drive Replay ──────────────────────────────────────────────────────────

    def list_drives(self, *, team_id: UUID, season: int, game_id: str | None = None) -> list[DriveSummary]:
        team_record = self.dataset.team_for_context(team_id)
        team_abbr = team_record.team_abbr if team_record else str(team_id)
        drives = self.dataset.drives_for_team(team_id, game_id=game_id, season=season)
        return [
            DriveSummary(
                drive_id=d.drive_id,
                game_id=d.game_id,
                team_id=team_abbr,
                season=d.season,
                week=d.week,
                play_count=d.play_count,
                start_yard_line=None,
                result=None,
            )
            for d in drives
        ]

    def get_drive(self, *, team_id: UUID, drive_id: str) -> DriveSummary:
        drive = self.dataset.drive_by_id(team_id, drive_id)
        if drive is None:
            raise AnalyticsReadNotFoundError(f"Drive '{drive_id}' was not found for the active team.")
        team_record = self.dataset.team_for_context(team_id)
        team_abbr = team_record.team_abbr if team_record else str(team_id)
        return DriveSummary(
            drive_id=drive.drive_id,
            game_id=drive.game_id,
            team_id=team_abbr,
            season=drive.season,
            week=drive.week,
            play_count=drive.play_count,
            start_yard_line=None,
            result=None,
        )

    def get_drive_clips(self, *, team_id: UUID, drive_id: str) -> list[DrivePlayClip]:
        drive = self.dataset.drive_by_id(team_id, drive_id)
        if drive is None:
            raise AnalyticsReadNotFoundError(f"Drive '{drive_id}' was not found for the active team.")

        play_lookup = {p.play_id: p for p in self.dataset.plays_for_team(team_id)}
        clips: list[DrivePlayClip] = []
        frame_cursor = 0
        for clip_index, pid in enumerate(drive.play_ids):
            play = play_lookup.get(pid)
            # Each play gets a fixed frame window; motion plays have real frames, others use 30-frame placeholder
            frame_count = 30
            clips.append(
                DrivePlayClip(
                    play_id=pid,
                    clip_index=clip_index,
                    frame_start=frame_cursor,
                    frame_end=frame_cursor + frame_count - 1,
                    offense_team_id=play.offense_team_abbr if play else None,
                    defense_team_id=play.defense_team_abbr if play else None,
                    dci=play.dci if play else None,
                    dis=play.dis if play else None,
                )
            )
            frame_cursor += frame_count + 5  # 5-frame bridge between plays
        return clips

    def get_drive_movement(self, *, team_id: UUID, drive_id: str) -> list[DriveMovementFrame]:
        drive = self.dataset.drive_by_id(team_id, drive_id)
        if drive is None:
            raise AnalyticsReadNotFoundError(f"Drive '{drive_id}' was not found for the active team.")

        all_frames: list[DriveMovementFrame] = []
        drive_frame_cursor = 0

        for clip_index, play_id in enumerate(drive.play_ids):
            motion_frames = self.dataset.motion_frames_by_play.get(play_id, ())
            if not motion_frames:
                continue
            max_frame = max(f.frame_id for f in motion_frames)
            for raw in motion_frames:
                all_frames.append(
                    DriveMovementFrame(
                        frame_id=drive_frame_cursor + raw.frame_id,
                        play_id=play_id,
                        clip_index=clip_index,
                        is_bridge=False,
                        nfl_id=raw.nfl_id,
                        player_label=raw.player_label,
                        player_position=raw.player_position or "",
                        player_side=raw.player_side or "",
                        x=raw.x,
                        y=raw.y,
                        s=0.0,
                        o=0.0,
                        dir=0.0,
                        node_stress=raw.node_stress,
                    )
                )
            drive_frame_cursor += max_frame + 5  # bridge offset

        return all_frames
