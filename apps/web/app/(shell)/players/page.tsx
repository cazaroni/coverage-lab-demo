import Link from "next/link";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { getApiBase, isApiConnectivityError } from "@/lib/api-client";
import { searchPlayers } from "@/lib/player-reads";
import { requireActiveTeamSession } from "@/lib/session";

export const metadata = { title: "Players" };

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireActiveTeamSession();
  const { q = "" } = await searchParams;
  const apiBase = getApiBase();

  let players: Awaited<ReturnType<typeof searchPlayers>> = [];
  let apiUnavailable = false;

  try {
    players = await searchPlayers(q, 25);
  } catch (err) {
    if (!isApiConnectivityError(err)) throw err;
    apiUnavailable = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.3em] text-muted-foreground">
          Coverage Lab
        </span>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.1em] text-foreground">
          Players
        </h1>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by position (e.g. DE, CB, MLB)…"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          Search
        </button>
      </form>

      {apiUnavailable ? (
        <BackendUnavailableCallout
          apiBase={apiBase}
          title="Backend API unavailable"
          body="Player search requires the local API. Start the full stack with pnpm dev."
        />
      ) : players.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {q ? `No players match "${q}".` : "Enter a position or player label to search."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-card/90 p-5">
          <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
            <div className="h-4 w-[3px] shrink-0 rounded-full bg-primary" />
            <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
              Results
            </span>
            <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.22em] text-muted-foreground">
              {players.length} players
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-white/6">
            {players.map((p) => (
              <li key={p.nfl_id}>
                <Link
                  href={`/players/${p.nfl_id}`}
                  prefetch={false}
                  className="flex items-center gap-4 py-3 transition-colors hover:text-foreground"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/8"
                  >
                    <span className="font-mono text-[0.55rem] font-bold uppercase text-foreground">
                      {p.position}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {p.display_name}
                    </span>
                    <span className="font-mono text-[0.52rem] uppercase tracking-[0.15em] text-muted-foreground">
                      {p.position} · {p.team_id} · nfl#{p.nfl_id}
                    </span>
                  </div>
                  <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.18em] text-primary">
                    View →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
