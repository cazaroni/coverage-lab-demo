import Link from "next/link";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { getApiBase, isApiConnectivityError } from "@/lib/api-client";
import { fetchPlayerProfile } from "@/lib/player-reads";
import { requireActiveTeamSession } from "@/lib/session";
import { ovrFormula, qualityColor, stressColor } from "@/lib/stress-colors";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Player profile" };

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ nfl_id: string }>;
}) {
  await requireActiveTeamSession();
  const { nfl_id } = await params;
  const nflIdNum = parseInt(nfl_id, 10);
  const apiBase = getApiBase();

  let profile: Awaited<ReturnType<typeof fetchPlayerProfile>> | null = null;
  let apiUnavailable = false;

  try {
    profile = await fetchPlayerProfile(nflIdNum);
  } catch (err) {
    if (!isApiConnectivityError(err)) throw err;
    apiUnavailable = true;
  }

  const identity = profile?.identity;
  const headline = profile?.headline;
  const trend = profile?.trend ?? [];
  const events = profile?.top_stress_events ?? [];

  const sc = headline ? stressColor(headline.avg_node_stress) : "#aac0dd";
  const ovr = headline
    ? ovrFormula(headline.avg_node_stress, 0.5, headline.avg_dis_while_on_field)
    : 0;


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/players"
          prefetch={false}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
        >
          ← Players
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex flex-col">
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.3em] text-muted-foreground">
            Player profile
          </span>
          <h1 className="font-heading text-xl font-bold uppercase tracking-wide text-foreground">
            {identity?.display_name ?? `NFL #${nfl_id}`}
          </h1>
        </div>
      </div>

      {apiUnavailable ? (
        <BackendUnavailableCallout
          apiBase={apiBase}
          title="Backend API unavailable"
          body="Player profile requires the local API. Start the full stack with pnpm dev."
        />
      ) : profile == null ? (
        <div className="rounded-xl border border-white/10 bg-card/90 p-8 text-center">
          <p className="text-sm text-muted-foreground">Player not found.</p>
        </div>
      ) : (
        <>
          {/* Identity card */}
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#07111d] p-5">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-55deg, white 0, white 1px, transparent 1px, transparent 10px)",
              }}
            />
            <div className="relative flex flex-wrap items-center gap-6">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: sc }}
              >
                <span className="font-mono text-[0.65rem] font-bold uppercase" style={{ color: sc }}>
                  {identity?.position}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.25em] text-muted-foreground">
                  {identity?.team_id} · nfl#{nfl_id}
                </span>
                <span className="font-heading text-2xl font-bold uppercase tracking-wide text-foreground">
                  {identity?.display_name}
                </span>
              </div>
              <div
                className="ml-auto flex flex-col items-end"
                style={{ color: sc }}
              >
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.25em] opacity-70">OVR</span>
                <span className="font-heading text-5xl font-bold leading-none tabular-nums">{ovr}</span>
              </div>
            </div>
          </div>

          {/* Headline metrics + radar */}
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-white/10 bg-card/90 p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-white/8 pb-3">
                <div className="h-4 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: sc }} />
                <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
                  Headline Metrics
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { label: "Avg Stress", value: headline!.avg_node_stress.toFixed(3), color: sc },
                  { label: "Plays Tracked", value: String(headline!.plays_tracked), color: "#aac0dd" },
                  { label: "Games Tracked", value: String(headline!.games_tracked), color: "#aac0dd" },
                  headline!.avg_dci_while_on_field != null
                    ? { label: "Avg DCI", value: headline!.avg_dci_while_on_field.toFixed(3), color: qualityColor(headline!.avg_dci_while_on_field) }
                    : { label: "Avg DCI", value: "—", color: "#aac0dd" },
                  headline!.avg_dis_while_on_field != null
                    ? { label: "Avg DIS", value: headline!.avg_dis_while_on_field.toFixed(3), color: stressColor(headline!.avg_dis_while_on_field) }
                    : { label: "Avg DIS", value: "—", color: "#aac0dd" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[0.48rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
                    <span className="font-heading text-xl font-bold tabular-nums" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Weekly trend */}
          {trend.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-card/90 p-5">
              <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
                <div className="h-4 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: "#f7b955" }} />
                <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
                  Weekly Stress Trend
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trend.map((pt) => (
                  <div
                    key={pt.week}
                    className="flex flex-col items-center gap-0.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="font-mono text-[0.45rem] uppercase tracking-[0.2em] text-muted-foreground">
                      Wk{pt.week}
                    </span>
                    <span
                      className="font-heading text-lg font-bold tabular-nums"
                      style={{ color: stressColor(pt.avg_node_stress) }}
                    >
                      {pt.avg_node_stress.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top stress events */}
          {events.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-card/90 p-5">
              <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
                <div className="h-4 w-[3px] shrink-0 rounded-full bg-[#f36f6f]" />
                <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
                  Top Stress Events
                </span>
              </div>
              <div className="flex flex-col divide-y divide-white/6">
                {events.map((evt, idx) => (
                  <div key={evt.play_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className="w-6 shrink-0 text-center font-heading text-xl font-bold leading-none tabular-nums"
                      style={{ color: idx === 0 ? "#f7b955" : "#3d5a7a" }}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-mono text-[0.6rem] text-foreground/80">
                        {evt.play_id} · Wk{evt.week}
                      </span>
                      <div className="flex gap-3">
                        {evt.dci != null && (
                          <span className="font-mono text-[0.52rem] text-muted-foreground">
                            DCI {evt.dci.toFixed(3)}
                          </span>
                        )}
                        {evt.dis != null && (
                          <span className="font-mono text-[0.52rem] text-muted-foreground">
                            DIS {evt.dis.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="font-heading text-2xl font-bold tabular-nums"
                      style={{ color: stressColor(evt.node_stress) }}
                    >
                      {evt.node_stress.toFixed(2)}
                    </span>
                    <Link
                      href={`/plays/${evt.play_id}`}
                      prefetch={false}
                      className="font-mono text-[0.52rem] uppercase tracking-[0.15em] text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
