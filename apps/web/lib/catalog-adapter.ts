/**
 * Adapter seam for Phase 1 catalog and dashboard data.
 *
 * All functions call the live backend REST API. The backend is session-scoped —
 * there is no team_id URL segment; the active team is resolved server-side from
 * the auth token. The teamId parameter is kept in each signature for call-site
 * stability but is not forwarded to the API.
 */

import type {
  CatalogFilters,
  ExplosivePlayMatch,
  GameSummary,
  PlayListRow,
  PlayerStressResilienceRow,
  TeamIntegrityTrend,
  TeamDCIDistributionPoint,
  TeamDISTrendPoint,
} from "@projectedge/schemas";
import {
  explosivePlayMatchSchema,
  gameSummarySchema,
  playListRowSchema,
  playerStressResilienceRowSchema,
  teamIntegrityTrendSchema,
  teamDCIDistributionPointSchema,
  teamDISTrendPointSchema,
} from "@projectedge/schemas";
import { z } from "zod";

import { apiGet } from "@/lib/api-client";

export async function fetchRecentGames(
  _teamId: string,
  limit = 5,
): Promise<GameSummary[]> {
  return apiGet("/games", z.array(gameSummarySchema), { limit });
}

export async function fetchTeamDCIDistribution(
  _teamId: string,
  season?: number,
): Promise<TeamDCIDistributionPoint[]> {
  return apiGet("/analytics/dci-distribution", z.array(teamDCIDistributionPointSchema), { season });
}

export async function fetchExplosivePlays(
  _teamId: string,
  limit = 5,
): Promise<ExplosivePlayMatch[]> {
  return apiGet("/analytics/explosive-plays", z.array(explosivePlayMatchSchema), { limit });
}

export async function fetchPlayerStressResilience(
  _teamId: string,
  limit = 5,
): Promise<PlayerStressResilienceRow[]> {
  return apiGet(
    "/analytics/player-stress-resilience",
    z.array(playerStressResilienceRowSchema),
    { limit },
  );
}

export async function fetchTeamDISTrend(
  _teamId: string,
  season?: number,
): Promise<TeamDISTrendPoint[]> {
  return apiGet("/analytics/dis-trend", z.array(teamDISTrendPointSchema), { season });
}

export async function fetchIntegrityTrend(
  _teamId: string,
  season?: number,
): Promise<TeamIntegrityTrend> {
  return apiGet("/analytics/integrity", teamIntegrityTrendSchema, { season });
}

export async function fetchPlayList(
  _teamId: string,
  filters?: CatalogFilters,
): Promise<PlayListRow[]> {
  return apiGet("/catalog/plays", z.array(playListRowSchema), {
    game_id: filters?.game_id,
    season: filters?.season,
    week: filters?.week,
    min_dci: filters?.min_dci,
    max_dci: filters?.max_dci,
  });
}
