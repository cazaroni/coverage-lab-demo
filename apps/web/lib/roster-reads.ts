import "server-only";

import type { RosterPlayer, RosterStressEvent, RosterTrendPoint } from "@/lib/roster-types";

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeTrend(seed: number, baseline: number): RosterTrendPoint[] {
  const r = seedRand(seed);
  const pts: RosterTrendPoint[] = [];
  let v = baseline;
  for (let w = 1; w <= 12; w++) {
    v = Math.max(0.05, Math.min(0.95, v + (r() - 0.5) * 0.12));
    pts.push({ week: w, stress: v });
  }
  return pts;
}

function topStressEvents(seed: number): RosterStressEvent[] {
  const r = seedRand(seed);
  const opponents = ["DAL", "NYG", "WAS", "SF", "GB", "DET"];
  const events: RosterStressEvent[] = [];
  for (let i = 0; i < 5; i++) {
    events.push({
      play_id: `PHI-2026-W${Math.floor(r() * 16) + 1}-${Math.floor(r() * 120) + 1}`,
      opponent: opponents[Math.min(Math.floor(r() * opponents.length), opponents.length - 1)],
      peak_stress: 0.62 + r() * 0.35,
      yards_allowed: Math.floor(r() * 28) + 2,
      quarter: Math.floor(r() * 4) + 1,
    });
  }
  return events.sort((a, b) => b.peak_stress - a.peak_stress);
}

function computeOvr(stress: number, resilience: number, dis: number): number {
  const v = Math.round(((1 - stress) * 0.45 + resilience * 0.35 + dis * 0.2) * 99) + 1;
  return Math.min(v, 99);
}

type RawPlayer = {
  nfl_id: number;
  display_name: string;
  position: string;
  jersey: number;
  slot: string;
  resilience: number;
  stress: number;
  dci: number;
  dis: number;
  games: number;
  plays: number;
  experience: number;
};

const RAW_PLAYERS: RawPlayer[] = [
  { nfl_id: 91, display_name: "Darius Lambert",  position: "DE",  jersey: 91, slot: "LDE",  resilience: 0.82, stress: 0.34, dci: 0.78, dis: 0.81, games: 14, plays: 612, experience: 7 },
  { nfl_id: 97, display_name: "Kavon Ellis",     position: "DT",  jersey: 97, slot: "LDT",  resilience: 0.71, stress: 0.42, dci: 0.69, dis: 0.73, games: 12, plays: 498, experience: 4 },
  { nfl_id: 93, display_name: "Jalen Okafor",    position: "DT",  jersey: 93, slot: "RDT",  resilience: 0.88, stress: 0.28, dci: 0.84, dis: 0.86, games: 15, plays: 641, experience: 9 },
  { nfl_id: 55, display_name: "Theo Brennan",    position: "DE",  jersey: 55, slot: "RDE",  resilience: 0.76, stress: 0.39, dci: 0.74, dis: 0.77, games: 13, plays: 555, experience: 5 },
  { nfl_id: 54, display_name: "Marcus Vale",     position: "OLB", jersey: 54, slot: "SAM",  resilience: 0.69, stress: 0.47, dci: 0.66, dis: 0.70, games: 11, plays: 472, experience: 3 },
  { nfl_id: 44, display_name: "Isaiah Holloway", position: "MLB", jersey: 44, slot: "MIKE", resilience: 0.91, stress: 0.22, dci: 0.88, dis: 0.89, games: 16, plays: 701, experience: 10 },
  { nfl_id: 58, display_name: "Reggie Navarro",  position: "OLB", jersey: 58, slot: "WILL", resilience: 0.64, stress: 0.58, dci: 0.61, dis: 0.63, games: 10, plays: 398, experience: 2 },
  { nfl_id: 24, display_name: "Dion Carver",     position: "CB",  jersey: 24, slot: "LCB",  resilience: 0.79, stress: 0.36, dci: 0.76, dis: 0.78, games: 14, plays: 588, experience: 6 },
  { nfl_id: 27, display_name: "Maurice Reed",    position: "CB",  jersey: 27, slot: "RCB",  resilience: 0.74, stress: 0.41, dci: 0.72, dis: 0.74, games: 13, plays: 541, experience: 4 },
  { nfl_id: 31, display_name: "Xavier Monroe",   position: "SS",  jersey: 31, slot: "SS",   resilience: 0.85, stress: 0.31, dci: 0.81, dis: 0.83, games: 15, plays: 623, experience: 8 },
  { nfl_id: 22, display_name: "Trey Ashford",    position: "FS",  jersey: 22, slot: "FS",   resilience: 0.87, stress: 0.29, dci: 0.82, dis: 0.85, games: 15, plays: 635, experience: 7 },
];

export const FIXTURE_PLAYERS: RosterPlayer[] = RAW_PLAYERS.map((p) => ({
  ...p,
  team_id: "PHI",
  ovr: computeOvr(p.stress, p.resilience, p.dis),
  trend: makeTrend(p.nfl_id, p.stress),
  events: topStressEvents(p.nfl_id),
}));

export type TeamSummary = {
  abbr: string;
  name: string;
  subname: string;
  avg_dci: number;
  avg_dis: number;
  avg_resilience: number;
  avg_stress: number;
  plays_tracked: number;
  week: number;
  record: string;
  next_opponent: string;
};

export const FIXTURE_TEAM: TeamSummary = {
  abbr: "PHI",
  name: "Philadelphia Defense",
  subname: "Defensive Unit · 2026 Season",
  avg_dci: FIXTURE_PLAYERS.reduce((s, p) => s + p.dci, 0) / FIXTURE_PLAYERS.length,
  avg_dis: FIXTURE_PLAYERS.reduce((s, p) => s + p.dis, 0) / FIXTURE_PLAYERS.length,
  avg_resilience: FIXTURE_PLAYERS.reduce((s, p) => s + p.resilience, 0) / FIXTURE_PLAYERS.length,
  avg_stress: FIXTURE_PLAYERS.reduce((s, p) => s + p.stress, 0) / FIXTURE_PLAYERS.length,
  plays_tracked: FIXTURE_PLAYERS.reduce((s, p) => s + p.plays, 0),
  week: 14,
  record: "10-3",
  next_opponent: "DAL",
};

export async function fetchRosterPlayers(): Promise<{
  players: RosterPlayer[];
  team: TeamSummary;
  apiUnavailable: boolean;
}> {
  // Backend roster endpoint uses a different schema than the design fixture.
  // For now always return the design-spec fixture data.
  return { players: FIXTURE_PLAYERS, team: FIXTURE_TEAM, apiUnavailable: true };
}
