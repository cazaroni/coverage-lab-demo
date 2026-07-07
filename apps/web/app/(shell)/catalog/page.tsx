import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { CatalogFilters } from "@/components/catalog-filters";
import { PlayListTable } from "@/components/play-list-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiBase, isApiConnectivityError } from "@/lib/api-client";
import { fetchPlayList, fetchRecentGames } from "@/lib/catalog-adapter";
import { requireActiveTeamSession } from "@/lib/session";

export const metadata = {
  title: "Game catalog",
};

type SearchParams = {
  game_id?: string;
  season?: string;
  week?: string;
  min_dci?: string;
  max_dci?: string;
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireActiveTeamSession();
  const t = await getTranslations("Catalog");
  const params = await searchParams;
  const apiBase = getApiBase();

  const filters = {
    game_id: params.game_id,
    season: params.season !== undefined ? parseInt(params.season, 10) : undefined,
    week: params.week !== undefined ? parseInt(params.week, 10) : undefined,
    min_dci: params.min_dci !== undefined ? parseFloat(params.min_dci) : undefined,
    max_dci: params.max_dci !== undefined ? parseFloat(params.max_dci) : undefined,
  };

  let apiUnavailable = false;
  let plays: Awaited<ReturnType<typeof fetchPlayList>> = [];
  let games: Awaited<ReturnType<typeof fetchRecentGames>> = [];

  try {
    [plays, games] = await Promise.all([
      fetchPlayList(session.activeTeamId, filters),
      fetchRecentGames(session.activeTeamId),
    ]);
  } catch (error) {
    if (!isApiConnectivityError(error)) {
      throw error;
    }
    apiUnavailable = true;
  }

  const gameIds = games.map((g) => g.game_id);

  const tableLabels = {
    playId: t("tablePlayId"),
    game: t("tableGame"),
    week: t("tableWeek"),
    dci: t("tableDci"),
    dis: t("tableDis"),
    offense: t("tableOffense"),
    defense: t("tableDefense"),
    noResults: t("noResults"),
  };

  const filterLabels = {
    filterGame: t("filterGame"),
    filterSeason: t("filterSeason"),
    filterWeek: t("filterWeek"),
    filterMinDci: t("filterMinDci"),
    filterMaxDci: t("filterMaxDci"),
    clearFilters: t("clearFilters"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl uppercase tracking-[0.12em] text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {apiUnavailable ? (
        <Card className="border-white/10 bg-card/90">
          <CardHeader>
            <CardTitle>{t("apiUnavailableCardTitle")}</CardTitle>
            <CardDescription>{t("apiUnavailableCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BackendUnavailableCallout
              apiBase={apiBase}
              body={t("apiUnavailableBody")}
              title={t("apiUnavailableTitle")}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground">
            {t("liveDataNote")}
          </div>

          <Card className="border-white/10 bg-card/90">
            <CardContent className="pt-4">
              <Suspense fallback={<Skeleton className="h-12 w-full" />}>
                <CatalogFilters games={gameIds} labels={filterLabels} />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/90">
            <CardHeader>
              <CardTitle>
                {plays.length} {plays.length === 1 ? "play" : "plays"}
              </CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PlayListTable plays={plays} labels={tableLabels} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
