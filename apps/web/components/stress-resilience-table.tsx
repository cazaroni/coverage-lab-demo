import type { PlayerStressResilienceRow } from "@projectedge/schemas";

type Props = {
  rows: PlayerStressResilienceRow[];
};

type RatingTier = { color: string; label: string };

function getRatingTier(score: number): RatingTier {
  if (score >= 0.8) return { color: "#37d0b6", label: "ELITE" };
  if (score >= 0.6) return { color: "#f7b955", label: "SOLID" };
  if (score >= 0.45) return { color: "#f97316", label: "AVG" };
  return { color: "#f36f6f", label: "AT RISK" };
}

export function StressResilienceTable({ rows }: Props) {
  return (
    <div
      className="flex flex-col divide-y divide-white/6"
      role="list"
      aria-label="Player stress resilience ranking"
    >
      {rows.map((row, idx) => {
        const { color, label } = getRatingTier(row.resilience_score);
        const score100 = Math.round(row.resilience_score * 100);
        const isTop = idx === 0;

        return (
          <div
            key={row.player_id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            role="listitem"
          >
            {/* Rank number */}
            <span
              className="w-6 shrink-0 text-center font-heading text-xl font-bold leading-none tabular-nums"
              style={{ color: isTop ? "#f7b955" : "#3d5a7a" }}
            >
              {idx + 1}
            </span>

            {/* Player info + bar */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[0.68rem] uppercase tracking-wide text-foreground">
                  {row.player_id}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[0.48rem] font-bold uppercase tracking-[0.18em]"
                    style={{
                      backgroundColor: `${color}1a`,
                      color,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    {label}
                  </span>
                  {/* FIFA-style OVR number */}
                  <span
                    className="w-8 text-right font-heading text-2xl font-bold leading-none tabular-nums"
                    style={{ color }}
                  >
                    {score100}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.resilience_score * 100}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}55`,
                  }}
                />
              </div>
            </div>

            {/* Sample count */}
            <span className="w-9 shrink-0 text-right font-mono text-[0.58rem] tabular-nums text-muted-foreground">
              {row.samples}n
            </span>
          </div>
        );
      })}
    </div>
  );
}
