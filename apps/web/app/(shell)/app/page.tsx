import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { IntegrityTrendCard } from "@/components/dashboard/integrity-trend-card";
import { TeamCommandHeader } from "@/components/dashboard/team-command-header";
import { QuickAccessCards } from "@/components/dashboard/quick-access-cards";
import { DciDistributionChart } from "@/components/dci-distribution-chart";
import { DisTrendSparkline } from "@/components/dis-trend-sparkline";
import { ExplosivePlaysList } from "@/components/explosive-plays-list";
import { RecentGamesList } from "@/components/recent-games-list";
import { StressResilienceTable } from "@/components/stress-resilience-table";
import { buttonVariants } from "@/components/ui/button";
import {
  getApiBase,
  isApiConnectivityError,
  isApiStatusError,
} from "@/lib/api-client";
import {
  fetchExplosivePlays,
  fetchIntegrityTrend,
  fetchPlayerStressResilience,
  fetchRecentGames,
  fetchTeamDCIDistribution,
  fetchTeamDISTrend,
} from "@/lib/catalog-adapter";
import { requireActiveTeamSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { TeamDCIDistributionPoint } from "@projectedge/schemas";

export const metadata = {
  title: "Dashboard",
};

function computeAvgDCI(dist: TeamDCIDistributionPoint[]): number | null {
  const total = dist.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;
  let weighted = 0;
  for (const d of dist) {
    const rawParts = d.bucket.split("-").map(Number);
    const lo = rawParts[0] ?? NaN;
    const hi = rawParts[1] ?? NaN;
    const mid = !isNaN(lo) && !isNaN(hi) ? (lo + hi) / 2 : 0.5;
    weighted += mid * d.count;
  }
  return weighted / total;
}

function BroadcastHeader({
  label,
  accent,
  meta,
}: {
  label: string;
  accent: string;
  meta?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-white/8 pb-3">
      <div
        className="h-4 w-[3px] shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
        {label}
      </span>
      {meta && (
        <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.22em] text-muted-foreground">
          {meta}
        </span>
      )}
    </div>
  );
}

function DashboardUnavailablePanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireActiveTeamSession();
  const t = await getTranslations("Dashboard");
  const apiBase = getApiBase();
  let season: number | null = null;

  const defaultSeason = new Date().getFullYear();

  let apiUnavailable = false;
  let recentGames: Awaited<ReturnType<typeof fetchRecentGames>> = [];
  let dciDistribution: Awaited<ReturnType<typeof fetchTeamDCIDistribution>> = [];
  let explosivePlays: Awaited<ReturnType<typeof fetchExplosivePlays>> = [];
  let resilience: Awaited<ReturnType<typeof fetchPlayerStressResilience>> = [];
  let disTrend: Awaited<ReturnType<typeof fetchTeamDISTrend>> = [];
  let integrityTrend: Awaited<ReturnType<typeof fetchIntegrityTrend>> = { points: [] };

  try {
    [recentGames, dciDistribution, explosivePlays, resilience, disTrend, integrityTrend] =
      await Promise.all([
        fetchRecentGames(session.activeTeamId),
        fetchTeamDCIDistribution(session.activeTeamId),
        fetchExplosivePlays(session.activeTeamId, 5),
        fetchPlayerStressResilience(session.activeTeamId, 5),
        fetchTeamDISTrend(session.activeTeamId),
        fetchIntegrityTrend(session.activeTeamId, defaultSeason).catch((error) => {
          if (isApiStatusError(error, 404, 501)) {
            return { points: [] };
          }
          throw error;
        }),
      ]);
    season = recentGames[0]?.season ?? null;
  } catch (error) {
    if (!isApiConnectivityError(error)) {
      throw error;
    }
    apiUnavailable = true;
  }

  const avgDCI = computeAvgDCI(dciDistribution);
  const avgDIS =
    disTrend.length > 0
      ? disTrend.reduce((s, d) => s + d.dis_average, 0) / disTrend.length
      : null;
  const totalPlays = recentGames.reduce((s, g) => s + g.play_count, 0);

  const teamName = (session.organizationName ?? "Defense").toUpperCase();
  const teamAbbr = (session.organizationName ?? "")
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DEF";

  const wins = recentGames.filter((g) => {
    const isHome = g.home_team_abbr === teamAbbr;
    const ts = isHome ? g.home_score : g.away_score;
    const os = isHome ? g.away_score : g.home_score;
    return ts != null && os != null && ts > os;
  }).length;
  const scoredGames = recentGames.filter((g) => {
    const isHome = g.home_team_abbr === teamAbbr;
    const ts = isHome ? g.home_score : g.away_score;
    const os = isHome ? g.away_score : g.home_score;
    return ts != null && os != null;
  }).length;
  const record = scoredGames > 0 ? `${wins}-${scoredGames - wins}` : "";

  const latestDIS = disTrend[disTrend.length - 1]?.dis_average ?? null;
  const prevDIS = disTrend[disTrend.length - 2]?.dis_average ?? null;
  const disRising = latestDIS !== null && prevDIS !== null ? latestDIS > prevDIS : null;

  return (
    <div className="flex flex-col gap-5">
      {apiUnavailable && (
        <BackendUnavailableCallout
          apiBase={apiBase}
          body={t("apiUnavailableBody")}
          title={t("apiUnavailableTitle")}
        />
      )}

      <TeamCommandHeader
        teamName={teamName}
        teamAbbr={teamAbbr}
        season={season}
        record={record}
        totalGames={recentGames.length}
        totalPlays={totalPlays}
        avgDci={avgDCI}
        avgDis={avgDIS}
        labels={{
          avgDci: t("commandHeaderAvgDci"),
          avgDis: t("commandHeaderAvgDis"),
          games: t("commandHeaderGames"),
          passPlays: t("commandHeaderPassPlays"),
          defensiveUnit: t("commandHeaderDefUnit"),
        }}
      />

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[260px] flex-1 rounded-xl border border-white/10 bg-card/90 p-5">
          <BroadcastHeader
            label={t("dciDistributionTitle")}
            accent="#f7b955"
            meta="COVERAGE FREQ"
          />
          {apiUnavailable ? (
            <DashboardUnavailablePanel message={t("apiUnavailableSection")} />
          ) : (
            <DciDistributionChart data={dciDistribution} />
          )}
        </div>

        <div className="min-w-[300px] flex-[2] rounded-xl border border-white/10 bg-card/90 p-5">
          <BroadcastHeader
            label={t("disTrendTitle")}
            accent={disRising === true ? "#f36f6f" : "#37d0b6"}
            meta="INTEGRITY INDEX"
          />
          {apiUnavailable ? (
            <DashboardUnavailablePanel message={t("apiUnavailableSection")} />
          ) : (
            <DisTrendSparkline data={disTrend} />
          )}
        </div>

        {apiUnavailable ? (
          <div className="min-w-[320px] flex-[2] rounded-xl border border-dashed border-white/10 bg-card/90 p-5 text-sm text-muted-foreground">
            {t("apiUnavailableSection")}
          </div>
        ) : (
          <IntegrityTrendCard points={integrityTrend.points} />
        )}

        <div className="min-w-[260px] flex-1 rounded-xl border border-white/10 bg-card/90 p-5">
          <BroadcastHeader
            label={t("resilienceRankingTitle")}
            accent="#37d0b6"
            meta="PLAYER RATINGS"
          />
          {apiUnavailable ? (
            <DashboardUnavailablePanel message={t("apiUnavailableSection")} />
          ) : (
            <StressResilienceTable rows={resilience} />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-card/90 p-5">
          <BroadcastHeader
            label={t("recentGamesTitle")}
            accent="#37d0b6"
            meta={season ? `SEASON ${season}` : undefined}
          />
          {apiUnavailable ? (
            <DashboardUnavailablePanel message={t("apiUnavailableSection")} />
          ) : (
            <RecentGamesList games={recentGames} teamAbbr={teamAbbr} />
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-card/90 p-5">
          <BroadcastHeader
            label={t("explosivePlaysTitle")}
            accent="#f36f6f"
            meta="PRE-SNAP ALERT"
          />
          {apiUnavailable ? (
            <DashboardUnavailablePanel message={t("apiUnavailableSection")} />
          ) : (
            <ExplosivePlaysList plays={explosivePlays} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-[3px] rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-muted-foreground">
              Coverage Lab
            </span>
            <span className="font-heading text-xl font-bold uppercase tracking-[0.1em] text-foreground">
              Quick Access
            </span>
          </div>
        </div>
        <Link
          href="/catalog"
          prefetch={false}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          {t("viewCatalog")}
        </Link>
      </div>

      <QuickAccessCards
        labels={{
          rosterLabel: t("quickAccessRosterLabel"),
          rosterSub: t("quickAccessRosterSub"),
          replayLabel: t("quickAccessReplayLabel"),
          replaySub: t("quickAccessReplaySub"),
        }}
      />

      <footer className="py-5 text-center">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/20">
          COVERAGE LAB · DECISION INTELLIGENCE FOR FOOTBALL TEAMS
        </span>
      </footer>
    </div>
  );
}
