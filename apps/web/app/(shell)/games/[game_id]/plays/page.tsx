import Link from "next/link";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { getApiBase, isApiConnectivityError } from "@/lib/api-client";
import { fetchGamePlays } from "@/lib/play-reads";
import { requireActiveTeamSession } from "@/lib/session";
import { stressColor } from "@/lib/stress-colors";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Game plays" };

export default async function GamePlaysPage({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  await requireActiveTeamSession();
  const { game_id } = await params;
  const apiBase = getApiBase();

  let plays: Awaited<ReturnType<typeof fetchGamePlays>> = [];
  let apiUnavailable = false;

  try {
    plays = await fetchGamePlays(game_id);
  } catch (err) {
    if (!isApiConnectivityError(err)) throw err;
    apiUnavailable = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/catalog"
          prefetch={false}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
        >
          ← Catalog
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex flex-col">
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.3em] text-muted-foreground">
            Game plays
          </span>
          <h1 className="font-heading text-xl font-bold uppercase tracking-wide text-foreground">
            {game_id}
          </h1>
        </div>
      </div>

      {apiUnavailable ? (
        <BackendUnavailableCallout
          apiBase={apiBase}
          title="Backend API unavailable"
          body="Game plays require the local API. Start the full stack with pnpm dev."
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-card/90 p-5">
          <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
            <div className="h-4 w-[3px] shrink-0 rounded-full bg-primary" />
            <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
              Plays
            </span>
            <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.22em] text-muted-foreground">
              {plays.length} plays
            </span>
          </div>

          {plays.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No plays found for this game.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8">
                    {["Play ID", "OFF", "DEF", "DCI", "DIS", ""].map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-left font-mono text-[0.48rem] uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {plays.map((play) => {
                    const dciColor = play.dci != null ? stressColor(1 - play.dci) : "#aac0dd";
                    const disColor = play.dis != null ? stressColor(play.dis) : "#aac0dd";
                    return (
                      <tr key={play.play_id} className="hover:bg-white/[0.02]">
                        <td className="py-2 pr-4 font-mono text-foreground/80">{play.play_id}</td>
                        <td className="py-2 pr-4 font-mono uppercase text-muted-foreground">{play.offense_team_id ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono uppercase text-muted-foreground">{play.defense_team_id ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono font-bold tabular-nums" style={{ color: dciColor }}>
                          {play.dci?.toFixed(3) ?? "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono font-bold tabular-nums" style={{ color: disColor }}>
                          {play.dis?.toFixed(3) ?? "—"}
                        </td>
                        <td className="py-2">
                          <Link
                            href={`/plays/${play.play_id}`}
                            prefetch={false}
                            className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-primary hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
