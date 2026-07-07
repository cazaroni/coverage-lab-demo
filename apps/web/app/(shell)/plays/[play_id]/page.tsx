import Link from "next/link";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { getApiBase, isApiConnectivityError } from "@/lib/api-client";
import { fetchPlayDetail } from "@/lib/play-reads";
import { requireActiveTeamSession } from "@/lib/session";
import { stressColor } from "@/lib/stress-colors";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReplayPlayer } from "@/components/replay/replay-player";
import { CoverageAnalysisPanel } from "@/components/replay/coverage-analysis-panel";
import { fetchPlayForensics } from "@/lib/play-reads";

export const metadata = { title: "Play detail" };

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 rounded-xl border px-4 py-3"
      style={{ borderColor: `${color}44`, backgroundColor: `${color}0d` }}
    >
      <span className="font-mono text-[0.45rem] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      <span className="font-heading text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default async function PlayDetailPage({
  params,
}: {
  params: Promise<{ play_id: string }>;
}) {
  await requireActiveTeamSession();
  const { play_id } = await params;
  const apiBase = getApiBase();

  let play: Awaited<ReturnType<typeof fetchPlayDetail>> | null = null;
  let forensics: Awaited<ReturnType<typeof fetchPlayForensics>> | null = null;
  let apiUnavailable = false;

  try {
    [play, forensics] = await Promise.all([
      fetchPlayDetail(play_id),
      fetchPlayForensics(play_id).catch(() => null),
    ]);
  } catch (err) {
    if (!isApiConnectivityError(err)) throw err;
    apiUnavailable = true;
  }

  const dciColor = play?.dci != null ? stressColor(1 - play.dci) : "#aac0dd";
  const disColor = play?.dis != null ? stressColor(play.dis) : "#aac0dd";

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
            Play detail
          </span>
          <h1 className="font-heading text-xl font-bold uppercase tracking-wide text-foreground">
            {play_id}
          </h1>
        </div>
      </div>

      {apiUnavailable ? (
        <BackendUnavailableCallout
          apiBase={apiBase}
          title="Backend API unavailable"
          body="Play detail requires the local API. Start the full stack with pnpm dev."
        />
      ) : play ? (
        <>
          <div className="flex flex-wrap gap-3">
            <MetricPill
              label="DCI"
              value={play.dci != null ? play.dci.toFixed(3) : "—"}
              color={dciColor}
            />
            <MetricPill
              label="DIS"
              value={play.dis != null ? play.dis.toFixed(3) : "—"}
              color={disColor}
            />
            <MetricPill label="Season" value={String(play.season)} color="#aac0dd" />
            <MetricPill label="Week" value={String(play.week)} color="#aac0dd" />
          </div>

          <div className="rounded-xl border border-white/10 bg-card/90 p-5">
            <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
              <div className="h-4 w-[3px] shrink-0 rounded-full bg-primary" />
              <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
                Play Info
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Play ID", value: play.play_id },
                { label: "Game ID", value: play.game_id },
                { label: "Model version", value: play.model_version ?? "—" },
                { label: "Dataset version", value: play.dataset_version ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[0.48rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="font-mono text-xs text-foreground/80 break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <ReplayPlayer
            playId={play_id}
            gameId={play.game_id}
            defenseTeam={play.team_id}
            week={play.week}
            season={play.season}
          />

          {forensics && <CoverageAnalysisPanel forensics={forensics} />}
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-card/90 p-8 text-center">
          <p className="text-sm text-muted-foreground">Play not found.</p>
        </div>
      )}
    </div>
  );
}
