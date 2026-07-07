import { z } from "zod";

// ─── Team / Season ────────────────────────────────────────────────────────────

export const gameSummarySchema = z.object({
  game_id: z.string(),
  season: z.number().int(),
  week: z.number().int(),
  home_team_abbr: z.string().nullable(),
  away_team_abbr: z.string().nullable(),
  home_score: z.number().int().nullable(),
  away_score: z.number().int().nullable(),
  play_count: z.number().int().gte(0),
});

export const teamDCIDistributionPointSchema = z.object({
  bucket: z.string(),
  count: z.number().int().gte(0),
});

export const explosivePlayMatchSchema = z.object({
  play_id: z.string(),
  game_id: z.string(),
  preceding_dis: z.number(),
  explosive_gain_yards: z.number().int().nullable(),
});

export const playerStressResilienceRowSchema = z.object({
  player_id: z.string(),
  team_id: z.string(),
  resilience_score: z.number(),
  samples: z.number().int().gte(0),
});

export const teamDISTrendPointSchema = z.object({
  team_id: z.string(),
  week: z.number().int(),
  observed_on: z.string().nullable(),
  dis_average: z.number(),
});

// ─── Catalog / Play list ─────────────────────────────────────────────────────

export const playListRowSchema = z.object({
  play_id: z.string(),
  game_id: z.string(),
  season: z.number().int(),
  week: z.number().int(),
  dci: z.number().nullable(),
  dis: z.number().nullable(),
  offense_team_id: z.string().nullable(),
  defense_team_id: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
});

export const catalogFiltersSchema = z.object({
  game_id: z.string().optional(),
  season: z.number().int().optional(),
  week: z.number().int().optional(),
  min_dci: z.number().optional(),
  max_dci: z.number().optional(),
});

// ─── Play detail (Phase 2 read) ───────────────────────────────────────────────

export const playDetailSchema = z.object({
  play_id: z.string(),
  game_id: z.string(),
  team_id: z.string(),
  season: z.number().int(),
  week: z.number().int(),
  dci: z.number().nullable(),
  dis: z.number().nullable(),
  dataset_version: z.string().nullable(),
  model_version: z.string().nullable(),
});

export const gamePlaySummarySchema = z.object({
  play_id: z.string(),
  game_id: z.string(),
  offense_team_id: z.string().nullable(),
  defense_team_id: z.string().nullable(),
  dci: z.number().nullable(),
  dis: z.number().nullable(),
});

export const playMovementFrameSchema = z.object({
  play_id: z.string(),
  game_id: z.string(),
  source_play_id: z.number().int(),
  frame_id: z.number().int(),
  nfl_id: z.number().int(),
  player_label: z.string(),
  player_position: z.string(),
  player_side: z.string(),
  x: z.number(),
  y: z.number(),
  s: z.number(),
  o: z.number(),
  dir: z.number(),
  node_stress: z.number(),
  frame_dci: z.number(),
  frame_dis: z.number(),
});

// ─── Player Profile (Phase 3 read) ───────────────────────────────────────────

export const playerIdentitySchema = z.object({
  nfl_id: z.number().int(),
  display_name: z.string(),
  position: z.string(),
  team_id: z.string(),
});

export const playerHeadlineMetricsSchema = z.object({
  avg_node_stress: z.number(),
  avg_dci_while_on_field: z.number().nullable(),
  avg_dis_while_on_field: z.number().nullable(),
  plays_tracked: z.number().int(),
  games_tracked: z.number().int(),
});

export const playerTrendPointSchema = z.object({
  week: z.number().int(),
  avg_node_stress: z.number(),
  game_id: z.string().nullable(),
});

export const playerStressEventSchema = z.object({
  play_id: z.string(),
  game_id: z.string(),
  week: z.number().int(),
  node_stress: z.number(),
  dci: z.number().nullable(),
  dis: z.number().nullable(),
});

export const playerProfileSchema = z.object({
  identity: playerIdentitySchema,
  headline: playerHeadlineMetricsSchema,
  trend: z.array(playerTrendPointSchema),
  top_stress_events: z.array(playerStressEventSchema),
});

// ─── Drive Replay (Phase 3 read) ─────────────────────────────────────────────

export const driveSummarySchema = z.object({
  drive_id: z.string(),
  game_id: z.string(),
  team_id: z.string(),
  season: z.number().int(),
  week: z.number().int(),
  play_count: z.number().int(),
  start_yard_line: z.number().int().nullable(),
  result: z.string().nullable(),
});

export const drivePlayClipSchema = z.object({
  play_id: z.string(),
  clip_index: z.number().int(),
  frame_start: z.number().int(),
  frame_end: z.number().int(),
  offense_team_id: z.string().nullable(),
  defense_team_id: z.string().nullable(),
  dci: z.number().nullable(),
  dis: z.number().nullable(),
});

export const driveMovementFrameSchema = z.object({
  frame_id: z.number().int(),
  play_id: z.string(),
  clip_index: z.number().int(),
  is_bridge: z.boolean(),
  nfl_id: z.number().int(),
  player_label: z.string(),
  player_position: z.string(),
  player_side: z.string(),
  x: z.number(),
  y: z.number(),
  s: z.number(),
  o: z.number(),
  dir: z.number(),
  node_stress: z.number(),
});

// ─── Forensics (Phase 3) ─────────────────────────────────────────────────────

export const collapseWindowSchema = z.object({
  start_frame: z.number().int(),
  end_frame: z.number().int(),
});

export const playForensicsSchema = z.object({
  play_id: z.string(),
  team_id: z.string(),
  dci: z.number(),
  dis: z.number(),
  model_version: z.string(),
  archetype_label: z.string(),
  // false -> headline scores only; per-frame fields are null (no tracking sample).
  // Backend always sends this; no default, so a missing field fails fast rather
  // than silently fabricating a film-backed play.
  has_motion: z.boolean(),
  peak_stress_frame: z.number().int().nullable(),
  peak_stress_entity_id: z.string().nullable(),
  peak_stress_value: z.number().nullable(),
  collapse_window: collapseWindowSchema.nullable(),
  plain_text_summary: z.string(),
});

// ─── Integrity Trend (Phase 3) ────────────────────────────────────────────────

export const teamIntegrityPointSchema = z.object({
  week: z.number().int(),
  avg_dci: z.number(),
  avg_dis: z.number(),
  play_count: z.number().int(),
});

export const teamIntegrityTrendSchema = z.object({
  points: z.array(teamIntegrityPointSchema),
});

// ─── Roster (Phase 2) ────────────────────────────────────────────────────────

export const rosterPlayerSchema = z.object({
  nfl_id: z.number().int(),
  player_id: z.string(),
  display_name: z.string(),
  position: z.string(),
  player_side: z.string(),
  team_id: z.string(),
  avg_node_stress: z.number(),
  avg_dci_while_on_field: z.number().nullable(),
  avg_dis_while_on_field: z.number().nullable(),
  plays_tracked: z.number().int().gte(0),
  games_tracked: z.number().int().gte(0),
  resilience_score: z.number(),
});

// ─── Inferred TypeScript types ────────────────────────────────────────────────

export type GameSummary = z.infer<typeof gameSummarySchema>;
export type TeamDCIDistributionPoint = z.infer<typeof teamDCIDistributionPointSchema>;
export type ExplosivePlayMatch = z.infer<typeof explosivePlayMatchSchema>;
export type PlayerStressResilienceRow = z.infer<typeof playerStressResilienceRowSchema>;
export type TeamDISTrendPoint = z.infer<typeof teamDISTrendPointSchema>;
export type PlayListRow = z.infer<typeof playListRowSchema>;
export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;
export type PlayDetail = z.infer<typeof playDetailSchema>;
export type GamePlaySummary = z.infer<typeof gamePlaySummarySchema>;
export type PlayMovementFrame = z.infer<typeof playMovementFrameSchema>;
export type PlayerIdentity = z.infer<typeof playerIdentitySchema>;
export type PlayerHeadlineMetrics = z.infer<typeof playerHeadlineMetricsSchema>;
export type PlayerTrendPoint = z.infer<typeof playerTrendPointSchema>;
export type PlayerStressEvent = z.infer<typeof playerStressEventSchema>;
export type PlayerProfile = z.infer<typeof playerProfileSchema>;
export type DriveSummary = z.infer<typeof driveSummarySchema>;
export type DrivePlayClip = z.infer<typeof drivePlayClipSchema>;
export type DriveMovementFrame = z.infer<typeof driveMovementFrameSchema>;
export type RosterPlayer = z.infer<typeof rosterPlayerSchema>;
export type CollapseWindow = z.infer<typeof collapseWindowSchema>;
export type PlayForensics = z.infer<typeof playForensicsSchema>;
export type TeamIntegrityPoint = z.infer<typeof teamIntegrityPointSchema>;
export type TeamIntegrityTrend = z.infer<typeof teamIntegrityTrendSchema>;
