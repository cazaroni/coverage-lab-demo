export type RosterStressEvent = {
  play_id: string;
  opponent: string;
  peak_stress: number;
  yards_allowed: number;
  quarter: number;
};

export type RosterTrendPoint = {
  week: number;
  stress: number;
};

export type RosterPlayer = {
  nfl_id: number;
  display_name: string;
  position: string;
  jersey: number;
  slot: string;
  team_id: string;
  resilience: number;
  stress: number;
  dci: number;
  dis: number;
  games: number;
  plays: number;
  experience: number;
  ovr: number;
  trend: RosterTrendPoint[];
  events: RosterStressEvent[];
};
