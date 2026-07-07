import type { GameSummary } from "@projectedge/schemas";

import Link from "next/link";

type Props = {
  games: GameSummary[];
  teamAbbr?: string;
};

export function RecentGamesList({ games, teamAbbr }: Props) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Recent games">
      {games.map((game, i) => {
        const isHome = teamAbbr ? game.home_team_abbr === teamAbbr : null;
        const teamScore = isHome != null ? (isHome ? game.home_score : game.away_score) : null;
        const oppScore = isHome != null ? (isHome ? game.away_score : game.home_score) : null;
        const opponent = isHome != null ? (isHome ? game.away_team_abbr : game.home_team_abbr) : null;
        const won =
          teamScore != null && oppScore != null ? teamScore > oppScore : null;
        const hasResult = won !== null;

        return (
          <li key={game.game_id}>
            <Link
              href={`/catalog?game_id=${game.game_id}`}
              prefetch={false}
              className="group flex items-center gap-2 overflow-hidden rounded-lg border border-white/8 bg-white/[0.03] transition-colors hover:border-white/14 hover:bg-white/[0.06]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {hasResult && (
                <div
                  className="flex w-8 shrink-0 flex-col items-center gap-0.5 border-r border-white/8 px-1 py-3"
                  style={{ color: won ? "#37d0b6" : "#f36f6f" }}
                >
                  <span
                    className="font-heading text-lg font-bold leading-none"
                  >
                    {won ? "W" : "L"}
                  </span>
                </div>
              )}

              <div className="flex w-14 shrink-0 flex-col items-center gap-0.5 border-r border-white/8 px-2 py-3">
                <span className="font-heading text-lg font-bold uppercase leading-none tracking-wide text-foreground">
                  {opponent ?? game.away_team_abbr ?? "-"}
                </span>
                <span className="font-mono text-[0.45rem] uppercase tracking-wider text-muted-foreground">
                  {opponent ? (isHome ? "home" : "away") : "away"}
                </span>
              </div>

              <div className="flex flex-1 flex-col items-center gap-0.5">
                {hasResult && teamScore != null && oppScore != null ? (
                  <div className="flex items-center gap-2.5">
                    <span
                      className="font-heading text-2xl font-bold leading-none tabular-nums"
                      style={{ color: won ? "#37d0b6" : "#f5f7fb" }}
                    >
                      {teamScore}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">-</span>
                    <span className="font-heading text-2xl font-bold leading-none tabular-nums text-foreground">
                      {oppScore}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span className="font-heading text-2xl font-bold leading-none tabular-nums text-foreground">
                      {game.away_score ?? "-"}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">-</span>
                    <span className="font-heading text-2xl font-bold leading-none tabular-nums text-foreground">
                      {game.home_score ?? "-"}
                    </span>
                  </div>
                )}
                <span className="font-mono text-[0.48rem] uppercase tracking-[0.22em] text-muted-foreground">
                  WK {game.week} · {game.season}
                </span>
              </div>

              <div className="flex w-14 shrink-0 flex-col items-center gap-0.5 border-l border-white/8 px-2 py-3">
                {!opponent && (
                  <>
                    <span className="font-heading text-lg font-bold uppercase leading-none tracking-wide text-foreground">
                      {game.home_team_abbr ?? "-"}
                    </span>
                    <span className="font-mono text-[0.45rem] uppercase tracking-wider text-muted-foreground">
                      home
                    </span>
                  </>
                )}
                {opponent && (
                  <>
                    <span
                      className="font-mono text-[0.48rem] uppercase font-bold tracking-[0.15em] rounded px-1.5 py-0.5"
                      style={{
                        color: won ? "#37d0b6" : "#f36f6f",
                        background: won ? "#37d0b622" : "#f36f6f22",
                        border: `1px solid ${won ? "#37d0b644" : "#f36f6f44"}`,
                      }}
                    >
                      {won ? "WIN" : "LOSS"}
                    </span>
                    <span className="mt-1 font-mono text-[0.45rem] uppercase tracking-wider text-muted-foreground">
                      {game.play_count} plays
                    </span>
                  </>
                )}
              </div>

              {!opponent && (
                <div className="flex w-14 shrink-0 flex-col items-center gap-0.5 border-l border-white/8 px-2 py-3">
                  <span className="font-heading text-base font-bold tabular-nums leading-none text-foreground/70">
                    {game.play_count}
                  </span>
                  <span className="font-mono text-[0.45rem] uppercase tracking-wider text-muted-foreground">
                    plays
                  </span>
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
