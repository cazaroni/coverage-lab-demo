from __future__ import annotations

import math

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response, status
from opentelemetry import trace

from app.auth import get_session_context
from app.config import Settings
from app.contracts import (
    ChatQuery,
    ChatReport,
    DBSessionContext,
    FindPlaysToolRequest,
    TeamContext,
    TeamContextPlay,
    ToolPlay,
    DependencyHealth,
    ErrorCode,
    GameSummary,
    HealthzResponse,
    PlayForensicsResponse,
    PlayListRow,
    ReplaySessionResponse,
    ScorePlayResult,
    SessionContext,
    SessionResponse,
    TeamIntegrityTrendResponse,
)
from app.dependencies import (
    get_analytics_engine,
    get_frontend_read_bridge,
    get_inference_client,
    get_runtime_settings,
    get_score_cache,
)
from app.frontend_reads import Phase1FrontendReadBridge
from app.intelligence.labels import dci_label, dis_label
from app.intelligence.orchestrator import DeterministicOrchestrator
from app.intelligence.tools import Toolbox
from app.metrics import metrics_response
from app.proto import inference_pb2
from app.replay_tokens import issue_replay_token
from app.scoring.cache import CachedScore, ScoreCache
from app.scoring.inference_client import InferenceClient, InferenceError
from app.scoring.payload import build_graph_payload, compute_payload_hash
from projectedge_analytics import (
    AnalyticsEngine,
    AnalyticsReadNotFoundError,
    BigDataBowlAnalyticsEngine,
    DriveMovementFrame,
    DrivePlayClip,
    DriveSummary,
    ExplosivePlayMatch,
    GamePlaySummary,
    PlayDetail,
    PlayMovementFrame,
    PlayerIdentity,
    PlayerProfile,
    PlayerStressResilienceRow,
    RosterPlayer,
    TeamDCIDistributionPoint,
    TeamDISTrendPoint,
)

router = APIRouter()


def _resolve_season(season: int | None, default_season: int) -> int:
    return season if season is not None else default_season


def _not_found(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error_code": ErrorCode.NOT_FOUND, "message": message},
    )


@router.get("/healthz", response_model=HealthzResponse, tags=["platform"])
async def healthz(request: Request) -> HealthzResponse:
    db_manager = request.app.state.db_manager
    db_status, db_detail = await db_manager.healthcheck()
    settings = request.app.state.settings
    status = "ok" if db_status in {"ok", "skipped"} else "degraded"
    return HealthzResponse(
        service=settings.service_name,
        status=status,
        version=settings.version,
        dependencies=[
            DependencyHealth(name="postgres", status=db_status, detail=db_detail),
        ],
    )


@router.get("/session", response_model=SessionResponse, tags=["auth"])
async def session(
    request: Request,
    session_context: SessionContext = Depends(get_session_context),
) -> SessionResponse:
    db_manager = request.app.state.db_manager
    db_session_context = DBSessionContext.from_session_context(session_context)
    db_session_context_applied = await db_manager.probe_session_context(db_session_context)
    return SessionResponse.from_session_context(
        session_context,
        db_session_context_applied=db_session_context_applied,
    )


@router.get("/games", response_model=list[GameSummary], tags=["analytics"])
async def list_recent_games(
    limit: int = Query(default=5, ge=1, le=25),
    season: int | None = Query(default=None, ge=2000, le=2100),
    settings: Settings = Depends(get_runtime_settings),
    frontend_reads: Phase1FrontendReadBridge = Depends(get_frontend_read_bridge),
    session_context: SessionContext = Depends(get_session_context),
) -> list[GameSummary]:
    resolved_season = _resolve_season(season, settings.analytics_default_season)
    return frontend_reads.list_recent_games(
        team_id=session_context.active_team_id,
        season=resolved_season,
        limit=limit,
    )


@router.get("/games/{game_id}/plays", response_model=list[GamePlaySummary], tags=["analytics"])
async def list_game_plays(
    game_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> list[GamePlaySummary]:
    try:
        return analytics_engine.list_game_plays(
            game_id=game_id,
            team_id=session_context.active_team_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc


@router.get("/catalog/plays", response_model=list[PlayListRow], tags=["analytics"])
async def list_catalog_plays(
    game_id: str | None = None,
    season: int | None = Query(default=None, ge=2000, le=2100),
    week: int | None = Query(default=None, ge=1, le=30),
    min_dci: float | None = Query(default=None, ge=0.0, le=1.0),
    max_dci: float | None = Query(default=None, ge=0.0, le=1.0),
    settings: Settings = Depends(get_runtime_settings),
    frontend_reads: Phase1FrontendReadBridge = Depends(get_frontend_read_bridge),
    session_context: SessionContext = Depends(get_session_context),
) -> list[PlayListRow]:
    resolved_season = _resolve_season(season, settings.analytics_default_season)
    return frontend_reads.list_catalog_plays(
        team_id=session_context.active_team_id,
        season=resolved_season,
        game_id=game_id,
        week=week,
        min_dci=min_dci,
        max_dci=max_dci,
    )


@router.get("/plays/{play_id}", response_model=PlayDetail, tags=["analytics"])
async def get_play_detail(
    play_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> PlayDetail:
    try:
        return analytics_engine.get_play_detail(
            play_id=play_id,
            team_id=session_context.active_team_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc


@router.get("/plays/{play_id}/movement", response_model=list[PlayMovementFrame], tags=["analytics"])
async def get_play_movement(
    play_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> list[PlayMovementFrame]:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found(f"Movement sample for play '{play_id}' is not available in the active backend.")

    try:
        return analytics_engine.list_play_movement(
            play_id=play_id,
            team_id=session_context.active_team_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc


@router.get(
    "/analytics/dci-distribution",
    response_model=list[TeamDCIDistributionPoint],
    tags=["analytics"],
)
async def get_team_dci_distribution(
    season: int | None = Query(default=None, ge=2000, le=2100),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> list[TeamDCIDistributionPoint]:
    return analytics_engine.get_team_season_dci_distribution(
        team_id=session_context.active_team_id,
        season=_resolve_season(season, settings.analytics_default_season),
    )


@router.get(
    "/analytics/explosive-plays",
    response_model=list[ExplosivePlayMatch],
    tags=["analytics"],
)
async def search_explosive_plays(
    limit: int = Query(default=5, ge=1, le=25),
    season: int | None = Query(default=None, ge=2000, le=2100),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> list[ExplosivePlayMatch]:
    matches = analytics_engine.search_explosive_plays(
        team_id=session_context.active_team_id,
        season=_resolve_season(season, settings.analytics_default_season),
    )
    return matches[:limit]


@router.get(
    "/analytics/player-stress-resilience",
    response_model=list[PlayerStressResilienceRow],
    tags=["analytics"],
)
async def rank_player_stress_resilience(
    limit: int = Query(default=5, ge=1, le=25),
    season: int | None = Query(default=None, ge=2000, le=2100),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> list[PlayerStressResilienceRow]:
    rows = analytics_engine.rank_player_stress_resilience(
        team_id=session_context.active_team_id,
        season=_resolve_season(season, settings.analytics_default_season),
    )
    return rows[:limit]


@router.get("/analytics/dis-trend", response_model=list[TeamDISTrendPoint], tags=["analytics"])
async def get_team_dis_trend(
    season: int | None = Query(default=None, ge=2000, le=2100),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> list[TeamDISTrendPoint]:
    return analytics_engine.get_team_dis_trend(
        team_id=session_context.active_team_id,
        season=_resolve_season(season, settings.analytics_default_season),
    )


@router.get("/players/search", response_model=list[PlayerIdentity], tags=["players"])
async def search_players(
    q: str = Query(default="", min_length=0),
    limit: int = Query(default=10, ge=1, le=50),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> list[PlayerIdentity]:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        return []
    return analytics_engine.search_players(
        team_id=session_context.active_team_id,
        q=q,
        limit=limit,
    )


@router.get("/players/{nfl_id}/profile", response_model=PlayerProfile, tags=["players"])
async def get_player_profile(
    nfl_id: int,
    season: int | None = Query(default=None, ge=2000, le=2100),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> PlayerProfile:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found(f"Player profile for nfl_id={nfl_id} is not available in the active backend.")
    resolved_season = _resolve_season(season, settings.analytics_default_season)
    try:
        return analytics_engine.get_player_profile(
            team_id=session_context.active_team_id,
            nfl_id=nfl_id,
            season=resolved_season,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc


@router.get("/roster/players", response_model=list[RosterPlayer], tags=["roster"])
async def list_roster_players(
    season: int | None = Query(default=None, ge=2000, le=2100),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> list[RosterPlayer]:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        return []
    resolved_season = _resolve_season(season, settings.analytics_default_season)
    return analytics_engine.list_roster_players(
        team_id=session_context.active_team_id,
        season=resolved_season,
    )


@router.get("/drives", response_model=list[DriveSummary], tags=["drives"])
async def list_drives(
    game_id: str | None = Query(default=None),
    season: int | None = Query(default=None, ge=2000, le=2100),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> list[DriveSummary]:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        return []
    resolved_season = _resolve_season(season, settings.analytics_default_season)
    return analytics_engine.list_drives(
        team_id=session_context.active_team_id,
        season=resolved_season,
        game_id=game_id,
    )


@router.get("/drives/{drive_id}", response_model=DriveSummary, tags=["drives"])
async def get_drive(
    drive_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> DriveSummary:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found(f"Drive '{drive_id}' is not available in the active backend.")
    try:
        return analytics_engine.get_drive(
            team_id=session_context.active_team_id,
            drive_id=drive_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc


@router.get("/drives/{drive_id}/clips", response_model=list[DrivePlayClip], tags=["drives"])
async def get_drive_clips(
    drive_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> list[DrivePlayClip]:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found(f"Drive '{drive_id}' is not available in the active backend.")
    try:
        return analytics_engine.get_drive_clips(
            team_id=session_context.active_team_id,
            drive_id=drive_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc


@router.get("/drives/{drive_id}/movement", response_model=list[DriveMovementFrame], tags=["drives"])
async def get_drive_movement(
    drive_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> list[DriveMovementFrame]:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found(f"Drive '{drive_id}' is not available in the active backend.")
    try:
        return analytics_engine.get_drive_movement(
            team_id=session_context.active_team_id,
            drive_id=drive_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc


def _issue_replay_jwt(
    *,
    subject: str,
    team_id: str,
    settings: Settings,
) -> ReplaySessionResponse:
    return issue_replay_token(subject=subject, team_id=team_id, settings=settings)


@router.post(
    "/plays/{play_id}/replay-session",
    response_model=ReplaySessionResponse,
    tags=["replay"],
)
async def create_play_replay_session(
    play_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> ReplaySessionResponse:
    try:
        analytics_engine.get_play_detail(
            play_id=play_id,
            team_id=session_context.active_team_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc
    return _issue_replay_jwt(
        subject=f"play:{play_id}",
        team_id=str(session_context.active_team_id),
        settings=settings,
    )


@router.post(
    "/drives/{drive_id}/replay-session",
    response_model=ReplaySessionResponse,
    tags=["replay"],
)
async def create_drive_replay_session(
    drive_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> ReplaySessionResponse:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found(f"Drive '{drive_id}' is not available in the active backend.")
    try:
        analytics_engine.get_drive(
            team_id=session_context.active_team_id,
            drive_id=drive_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc
    return _issue_replay_jwt(
        subject=f"drive:{drive_id}",
        team_id=str(session_context.active_team_id),
        settings=settings,
    )


_tracer = trace.get_tracer(__name__)

_SCORE_HEADER_DOC = {
    200: {
        "headers": {
            "x-model-version": {
                "description": "Model version that produced the score.",
                "schema": {"type": "string"},
            }
        }
    }
}


def _require_scoring_backend(analytics_engine: AnalyticsEngine, play_id: str) -> BigDataBowlAnalyticsEngine:
    # Scoring needs per-frame movement, which only the BigDataBowl engine provides.
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found(f"Scoring is not available for play '{play_id}' on the active backend.")
    return analytics_engine


def _valid_score(value: float) -> bool:
    """A score must be a finite number in [0, 1]; anything else is corrupt and must
    not enter the durable cache (a buggy/hostile inference build could otherwise
    poison a team's scores with NaN/inf/out-of-range values)."""
    return math.isfinite(value) and 0.0 <= value <= 1.0


def _score_error(model_version: str, payload_hash: str, detail: str) -> ScorePlayResult:
    """Typed unscored result for a scoring failure — never cached, surfaced as 502
    for single-score and as an isolated error entry within a batch."""
    return ScorePlayResult(
        model_version=model_version,
        payload_hash=payload_hash,
        cached=False,
        score_response={"dci": None, "dis": None, "score_status": "error", "detail": detail[:300]},
    )


async def _score_one_play(
    *,
    play_id: str,
    engine: BigDataBowlAnalyticsEngine,
    settings: Settings,
    session_context: SessionContext,
    inference_client: InferenceClient,
    score_cache: ScoreCache,
) -> ScorePlayResult:
    """Real scoring path (ADR-0001): assemble GraphPayload -> payload_hash ->
    cache lookup -> inference -> cache write. Raises AnalyticsReadNotFoundError
    when the play has no movement sample."""
    team_id = session_context.active_team_id
    # Validates existence (raises AnalyticsReadNotFoundError) before assembling.
    engine.get_play_detail(play_id=play_id, team_id=team_id)
    frames = engine.list_play_movement(play_id=play_id, team_id=team_id)

    model_version = settings.inference_model_version
    db_ctx = DBSessionContext.from_session_context(session_context)

    with _tracer.start_as_current_span("score.assemble_payload"):
        payload = build_graph_payload(
            frames, schema_version=settings.inference_payload_schema_version
        )
        payload_hash = compute_payload_hash(payload)

    with _tracer.start_as_current_span("score.cache_lookup"):
        cached = await score_cache.get(
            team_id=team_id,
            model_version=model_version,
            payload_hash=payload_hash,
            db_session_context=db_ctx,
        )
    if cached is not None:
        return ScorePlayResult(
            model_version=model_version,
            payload_hash=payload_hash,
            cached=True,
            score_response=cached.as_score_response_dict(),
        )

    with _tracer.start_as_current_span("score.inference_call"):
        score_request = inference_pb2.ScoreRequest(
            context=inference_pb2.RequestContext(
                team_id=str(team_id),
                session_id=session_context.session_id,
            ),
            payload=payload,
            model_version=model_version,
        )
        try:
            score_response = await inference_client.score(score_request)
        except InferenceError as exc:
            # Don't 500 / abort a batch — return a typed unscored error, no cache write.
            return _score_error(model_version, payload_hash, f"inference unavailable: {exc}")

    # Trust + cache only a complete, correctly-identified response (ADR-0001). The
    # model version must match the requested pin EXACTLY — empty/blank fails closed,
    # so a default-constructed/garbage response can't be stored as scored zeros. The
    # provenance hash must agree when the service reports one, and the result must
    # carry an explicit status. A malformed response must never poison the cache.
    if score_response.model_version != model_version:
        return _score_error(
            model_version,
            payload_hash,
            f"inference served model {score_response.model_version!r}, requested {model_version!r}",
        )
    # ADR-0001: inference returns payload_hash on EVERY response. Require it and
    # require exact agreement — a blank/missing hash is a provenance failure and must
    # not be cached (a remote scorer can't store results under our trusted local hash).
    if score_response.payload_hash != payload_hash:
        return _score_error(
            model_version,
            payload_hash,
            f"payload_hash mismatch/missing: inference {score_response.payload_hash!r} != {payload_hash!r}",
        )
    if not score_response.result.score_status:
        return _score_error(model_version, payload_hash, "inference returned no score_status")
    if not _valid_score(score_response.result.dci) or not _valid_score(score_response.result.dis):
        return _score_error(
            model_version,
            payload_hash,
            f"inference returned out-of-range scores: dci={score_response.result.dci}, "
            f"dis={score_response.result.dis}",
        )

    result = score_response.result
    entry = CachedScore(
        dci=result.dci,
        dis=result.dis,
        score_status=result.score_status,
        frame_scores=[
            {"frame_index": fs.frame_index, "dci": fs.dci, "dis": fs.dis}
            for fs in result.frame_scores
        ],
    )
    with _tracer.start_as_current_span("score.cache_write"):
        await score_cache.put(
            team_id=team_id,
            model_version=model_version,
            payload_hash=payload_hash,
            play_id=play_id,
            entry=entry,
            db_session_context=db_ctx,
        )

    return ScorePlayResult(
        model_version=model_version,
        payload_hash=payload_hash,
        cached=False,
        score_response=entry.as_score_response_dict(),
    )


@router.post(
    "/plays/{play_id}/score",
    response_model=ScorePlayResult,
    tags=["scoring"],
    responses=_SCORE_HEADER_DOC,
)
async def score_play(
    play_id: str,
    response: Response,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
    inference_client: InferenceClient = Depends(get_inference_client),
    score_cache: ScoreCache = Depends(get_score_cache),
) -> ScorePlayResult:
    engine = _require_scoring_backend(analytics_engine, play_id)
    try:
        result = await _score_one_play(
            play_id=play_id,
            engine=engine,
            settings=settings,
            session_context=session_context,
            inference_client=inference_client,
            score_cache=score_cache,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc
    if result.score_response.get("score_status") == "error":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_code": "inference_error",
                "message": str(result.score_response.get("detail", "scoring failed")),
            },
        )
    response.headers["x-model-version"] = result.model_version
    return result


@router.post("/plays/batch-score", response_model=list[ScorePlayResult], tags=["scoring"])
async def batch_score_plays(
    play_ids: list[str] = Body(..., max_length=50),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
    inference_client: InferenceClient = Depends(get_inference_client),
    score_cache: ScoreCache = Depends(get_score_cache),
) -> list[ScorePlayResult]:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        return []
    results: list[ScorePlayResult] = []
    for play_id in play_ids:
        try:
            results.append(
                await _score_one_play(
                    play_id=play_id,
                    engine=analytics_engine,
                    settings=settings,
                    session_context=session_context,
                    inference_client=inference_client,
                    score_cache=score_cache,
                )
            )
        except AnalyticsReadNotFoundError:
            continue
    return results


@router.get("/plays/{play_id}/forensics", response_model=PlayForensicsResponse, tags=["analytics"])
async def get_play_forensics(
    play_id: str,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> PlayForensicsResponse:
    try:
        forensics = analytics_engine.get_play_forensics(
            play_id=play_id,
            team_id=session_context.active_team_id,
        )
    except AnalyticsReadNotFoundError as exc:
        raise _not_found(str(exc)) from exc
    return PlayForensicsResponse(
        play_id=forensics.play_id,
        team_id=forensics.team_id,
        dci=forensics.dci,
        dis=forensics.dis,
        model_version=forensics.model_version,
        archetype_label=forensics.archetype_label,
        has_motion=forensics.has_motion,
        peak_stress_frame=forensics.peak_stress_frame,
        peak_stress_entity_id=forensics.peak_stress_entity_id,
        peak_stress_value=forensics.peak_stress_value,
        collapse_window=(
            {"start_frame": forensics.collapse_window.start_frame, "end_frame": forensics.collapse_window.end_frame}
            if forensics.collapse_window else None
        ),
        plain_text_summary=forensics.plain_text_summary,
    )


@router.get("/analytics/integrity", response_model=TeamIntegrityTrendResponse, tags=["analytics"])
async def get_team_integrity(
    season: int = Query(..., ge=2000, le=2100, description="NFL season year"),
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    session_context: SessionContext = Depends(get_session_context),
) -> TeamIntegrityTrendResponse:
    points = analytics_engine.get_team_integrity_trends(
        team_id=session_context.active_team_id,
        season=season,
    )
    return TeamIntegrityTrendResponse(
        team_id=str(session_context.active_team_id),
        season=season,
        points=[
            {"week": p.week, "avg_dci": p.avg_dci, "avg_dis": p.avg_dis, "play_count": p.play_count}
            for p in points
        ],
    )


@router.post("/intelligence/query", response_model=ChatReport, tags=["intelligence"])
async def intelligence_query(
    query: ChatQuery,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    frontend_reads: Phase1FrontendReadBridge = Depends(get_frontend_read_bridge),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> ChatReport:
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        raise _not_found("Intelligence is not available on the active backend.")
    season = query.season or settings.analytics_default_season
    toolbox = Toolbox(
        engine=analytics_engine,
        frontend_reads=frontend_reads,
        settings=settings,
        team_id=session_context.active_team_id,
        season=season,
    )
    orchestrator = DeterministicOrchestrator(
        toolbox, model_version=settings.inference_model_version
    )
    return orchestrator.answer(query.question)


@router.post("/intelligence/tools/find-plays", response_model=list[ToolPlay], tags=["intelligence"])
async def tool_find_plays(
    body: FindPlaysToolRequest,
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    frontend_reads: Phase1FrontendReadBridge = Depends(get_frontend_read_bridge),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> list[ToolPlay]:
    """Granular tool endpoint for the chat layer: team-scoped plays ranked by
    coverage scores, with plain-English labels attached for the LLM."""
    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        return []
    season = body.season or settings.analytics_default_season
    toolbox = Toolbox(
        engine=analytics_engine,
        frontend_reads=frontend_reads,
        settings=settings,
        team_id=session_context.active_team_id,
        season=season,
    )
    rows = toolbox.find_plays(
        week=body.week,
        min_dci=body.min_dci,
        max_dci=body.max_dci,
        sort=body.sort,
        limit=body.limit,
    )
    return [
        ToolPlay(
            play_id=row.play_id,
            week=row.week,
            opponent=row.offense_team_id,
            dci=row.dci,
            dis=row.dis,
            dci_label=dci_label(row.dci),
            dis_label=dis_label(row.dis),
            deep_link=f"/plays/{row.play_id}",
        )
        for row in rows
    ]


@router.get("/intelligence/context", response_model=TeamContext, tags=["intelligence"])
async def intelligence_context(
    analytics_engine: AnalyticsEngine = Depends(get_analytics_engine),
    frontend_reads: Phase1FrontendReadBridge = Depends(get_frontend_read_bridge),
    settings: Settings = Depends(get_runtime_settings),
    session_context: SessionContext = Depends(get_session_context),
) -> TeamContext:
    """Deterministic grounding briefing for the chat layer: who the team is, what
    data exists this season, and the headline scores — so the assistant answers
    immediately and never falsely claims ignorance about basics."""
    season = settings.analytics_default_season
    team_name = getattr(session_context, "team_name", None) or settings.development_team_name

    if not isinstance(analytics_engine, BigDataBowlAnalyticsEngine):
        return TeamContext(
            team_name=team_name,
            season=season,
            scored_play_count=0,
            motion_play_count=0,
            weeks_covered=[],
            season_dci_label=dci_label(None),
            season_dis_label=dis_label(None),
        )

    team_id = session_context.active_team_id
    points = analytics_engine.get_team_integrity_trends(team_id=team_id, season=season)
    scored = sum(p.play_count for p in points)
    weeks = sorted({p.week for p in points})

    # Plays with per-frame film (forensics/replay) are a subset of scored plays.
    # Surface the count so the chatbot doesn't promise film it can't deliver.
    motion_ids = set(getattr(analytics_engine.dataset, "motion_frames_by_play", {}))
    team_play_ids = {
        p.play_id for p in analytics_engine.dataset.plays if p.team_context_id == team_id
    }
    motion_count = len(motion_ids & team_play_ids)
    avg_dci = (
        sum(p.avg_dci * p.play_count for p in points) / scored if scored else None
    )
    avg_dis = (
        sum(p.avg_dis * p.play_count for p in points) / scored if scored else None
    )

    toolbox = Toolbox(
        engine=analytics_engine,
        frontend_reads=frontend_reads,
        settings=settings,
        team_id=session_context.active_team_id,
        season=season,
    )

    def _ctx_play(rows: list) -> TeamContextPlay | None:
        if not rows:
            return None
        row = rows[0]
        return TeamContextPlay(
            play_id=row.play_id,
            week=row.week,
            opponent=row.offense_team_id,
            dci=row.dci,
            dis=row.dis,
            label=dci_label(row.dci),
            deep_link=f"/plays/{row.play_id}",
        )

    return TeamContext(
        team_name=team_name,
        season=season,
        scored_play_count=scored,
        motion_play_count=motion_count,
        weeks_covered=weeks,
        season_avg_dci=round(avg_dci, 4) if avg_dci is not None else None,
        season_avg_dis=round(avg_dis, 4) if avg_dis is not None else None,
        season_dci_label=dci_label(avg_dci),
        season_dis_label=dis_label(avg_dis),
        weakest_play=_ctx_play(toolbox.find_plays(sort="dci_asc", limit=1)),
        tightest_play=_ctx_play(toolbox.find_plays(sort="dci_desc", limit=1)),
    )


@router.get("/metrics", include_in_schema=False)
async def metrics():
    return metrics_response()
