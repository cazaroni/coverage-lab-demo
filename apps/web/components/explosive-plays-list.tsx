import type { ExplosivePlayMatch } from "@projectedge/schemas";

import Link from "next/link";

type Props = {
  plays: ExplosivePlayMatch[];
};

type AlertTier = { color: string; label: string };

function getAlertTier(dis: number): AlertTier {
  if (dis >= 0.5) return { color: "#f36f6f", label: "CRITICAL" };
  if (dis >= 0.35) return { color: "#f97316", label: "WARNING" };
  if (dis >= 0.2) return { color: "#f7b955", label: "CAUTION" };
  return { color: "#37d0b6", label: "STABLE" };
}

export function ExplosivePlaysList({ plays }: Props) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Explosive plays list">
      {plays.map((play) => {
        const { color, label } = getAlertTier(play.preceding_dis);
        return (
          <li key={play.play_id}>
            <Link
              href={`/catalog?game_id=${play.game_id}&play_id=${play.play_id}`}
              prefetch={false}
              className="group flex items-stretch overflow-hidden rounded-lg border border-white/8 bg-white/[0.03] transition-colors hover:border-white/14 hover:bg-white/[0.06]"
            >
              {/* Left tier bar */}
              <div
                className="w-[3px] shrink-0"
                style={{ backgroundColor: color }}
              />

              {/* Content */}
              <div className="flex flex-1 items-center gap-3 px-3.5 py-3">
                {/* Pre-snap DIS block */}
                <div className="flex flex-col gap-0.5">
                  <span
                    className="font-mono text-[0.48rem] font-bold uppercase tracking-[0.2em]"
                    style={{ color }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-heading text-[1.6rem] font-bold leading-none tabular-nums"
                    style={{ color }}
                  >
                    {play.preceding_dis.toFixed(2)}
                  </span>
                  <span className="font-mono text-[0.45rem] uppercase tracking-[0.15em] text-muted-foreground">
                    pre-snap DIS
                  </span>
                </div>

                {/* Divider */}
                <div className="h-8 w-px shrink-0 bg-white/10" />

                {/* Play metadata */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-mono text-[0.6rem] uppercase tracking-wide text-foreground/70">
                    PLAY {play.play_id}
                  </span>
                  <span className="truncate font-mono text-[0.58rem] uppercase tracking-wide text-muted-foreground">
                    GAME {play.game_id}
                  </span>
                </div>

                {/* Gain display */}
                {play.explosive_gain_yards !== null && (
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="font-heading text-2xl font-bold leading-none tabular-nums text-[#f7b955]">
                      +{play.explosive_gain_yards}
                    </span>
                    <span className="font-mono text-[0.48rem] uppercase tracking-[0.18em] text-muted-foreground">
                      yards
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
