import Link from "next/link";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { getApiBase, isApiConnectivityError } from "@/lib/api-client";
import { fetchDrives } from "@/lib/drive-reads";
import { requireActiveTeamSession } from "@/lib/session";

export const metadata = { title: "Drive replay" };

type SearchParams = { game_id?: string; season?: string };

export default async function DrivesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireActiveTeamSession();
  const { game_id, season: seasonStr } = await searchParams;
  const season = seasonStr ? parseInt(seasonStr, 10) : undefined;
  const apiBase = getApiBase();

  let drives: Awaited<ReturnType<typeof fetchDrives>> = [];
  let apiUnavailable = false;

  try {
    drives = await fetchDrives(game_id, season);
  } catch (err) {
    if (!isApiConnectivityError(err)) throw err;
    apiUnavailable = true;
  }

  const byWeek = drives.reduce<Record<number, typeof drives>>((acc, d) => {
    (acc[d.week] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.3em] text-muted-foreground">
          Coverage Lab
        </span>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.1em] text-foreground">
          Drive Replay
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a drive to review stitched defensive plays.
        </p>
      </div>

      {apiUnavailable ? (
        <BackendUnavailableCallout
          apiBase={apiBase}
          title="Backend API unavailable"
          body="Drive data requires the local API. Start the full stack with pnpm dev."
        />
      ) : drives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">No drives found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(byWeek)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, weekDrives]) => (
              <div key={week} className="rounded-xl border border-white/10 bg-card/90 p-5">
                <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
                  <div className="h-4 w-[3px] shrink-0 rounded-full bg-primary" />
                  <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
                    Week {week}
                  </span>
                  <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.22em] text-muted-foreground">
                    {weekDrives.length} drives
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {weekDrives.map((d) => (
                    <Link
                      key={d.drive_id}
                      href={`/drives/${d.drive_id}`}
                      prefetch={false}
                      className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/14 hover:bg-white/[0.06]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-medium text-foreground">
                          {d.drive_id}
                        </span>
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.15em] text-muted-foreground">
                          {d.play_count} plays · Wk{d.week}
                        </span>
                      </div>
                      <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.18em] text-primary">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
