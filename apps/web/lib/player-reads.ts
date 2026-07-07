import "server-only";

import type { PlayerIdentity, PlayerProfile } from "@projectedge/schemas";
import { playerIdentitySchema, playerProfileSchema } from "@projectedge/schemas";
import { z } from "zod";

import { apiGet } from "@/lib/api-client";

export async function fetchPlayerProfile(nflId: number, season?: number): Promise<PlayerProfile> {
  return apiGet(
    `/players/${encodeURIComponent(nflId)}/profile`,
    playerProfileSchema,
    season !== undefined ? { season } : undefined,
  );
}

export async function searchPlayers(q: string, limit = 10): Promise<PlayerIdentity[]> {
  return apiGet("/players/search", z.array(playerIdentitySchema), { q, limit });
}
