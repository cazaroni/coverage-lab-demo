/**
 * Typed fetch helpers for Phase 2 play-detail reads.
 *
 * These back the upcoming /plays/[play_id] and /games/[game_id]/plays routes.
 * Do not build P2 UI from here yet — these are wiring only.
 */

import type { GamePlaySummary, PlayDetail, PlayForensics, PlayMovementFrame } from "@projectedge/schemas";
import { gamePlaySummarySchema, playDetailSchema, playForensicsSchema, playMovementFrameSchema } from "@projectedge/schemas";
import { z } from "zod";

import { apiGet } from "@/lib/api-client";

export async function fetchPlayDetail(playId: string): Promise<PlayDetail> {
  return apiGet(`/plays/${encodeURIComponent(playId)}`, playDetailSchema);
}

export async function fetchGamePlays(gameId: string): Promise<GamePlaySummary[]> {
  return apiGet(
    `/games/${encodeURIComponent(gameId)}/plays`,
    z.array(gamePlaySummarySchema),
  );
}

export async function fetchPlayMovement(playId: string): Promise<PlayMovementFrame[]> {
  return apiGet(
    `/plays/${encodeURIComponent(playId)}/movement`,
    z.array(playMovementFrameSchema),
  );
}

export async function fetchPlayForensics(playId: string): Promise<PlayForensics> {
  return apiGet(`/plays/${encodeURIComponent(playId)}/forensics`, playForensicsSchema);
}
