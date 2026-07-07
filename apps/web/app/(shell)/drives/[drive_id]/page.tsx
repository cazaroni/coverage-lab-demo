import Link from "next/link";

import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { getApiBase, isApiConnectivityError } from "@/lib/api-client";
import { fetchDrive, fetchDriveClips } from "@/lib/drive-reads";
import { requireActiveTeamSession } from "@/lib/session";
import { stressColor } from "@/lib/stress-colors";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DriveReplayPlayer } from "@/components/replay/drive-replay-player";

export const metadata = { title: "Drive replay" };

export default async function DriveDetailPage({
  params,
}: {
  params: Promise<{ drive_id: string }>;
}) {
  await requireActiveTeamSession();
  const { drive_id } = await params;
  const apiBase = getApiBase();

  let drive: Awaited<ReturnType<typeof fetchDrive>> | null = null;
  let clips: Awaited<ReturnType<typeof fetchDriveClips>> = [];
  let apiUnavailable = false;

  try {
    drive = await fetchDrive(drive_id);
    clips = await fetchDriveClips(drive_id);
  } catch (err) {
    if (!isApiConnectivityError(err)) throw err;
    apiUnavailable = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/drives"
          prefetch={false}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
        >
          ← Drives
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex flex-col">
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.3em] text-muted-foreground">
            Drive replay
          </span>
          <h1 className="font-heading text-xl font-bold uppercase tracking-wide text-foreground">
            {drive_id}
          </h1>
        </div>
      </div>

      {apiUnavailable ? (
        <BackendUnavailableCallout
          apiBase={apiBase}
          title="Backend API unavailable"
          body="Drive data requires the local API. Start the full stack with pnpm dev."
        />
      ) : drive == null ? (
        <div className="rounded-xl border border-white/10 bg-card/90 p-8 text-center">
          <p className="text-sm text-muted-foreground">Drive not found.</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-[#07111d] sm:grid-cols-4">
            {[
              { label: "Game ID", value: drive.game_id },
              { label: "Season", value: String(drive.season) },
              { label: "Week", value: String(drive.week) },
              { label: "Plays", value: String(drive.play_count) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col gap-0.5 border-r border-white/8 px-4 py-3 last:border-r-0"
              >
                <span className="font-mono text-[0.45rem] uppercase tracking-[0.25em] text-muted-foreground">
                  {label}
                </span>
                <span className="font-heading text-lg font-bold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          <DriveReplayPlayer
            driveId={drive_id}
            gameId={drive.game_id}
            clips={clips}
            week={drive.week}
            season={drive.season}
          />

          {/* Play clips */}
          {clips.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-card/90 p-5">
              <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
                <div className="h-4 w-[3px] shrink-0 rounded-full bg-primary" />
                <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
                  Play Sequence
                </span>
                <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {clips.length} clips
                </span>
              </div>
              <div className="flex flex-col divide-y divide-white/6">
                {clips.map((clip) => {
                  const dciColor = clip.dci != null ? stressColor(1 - clip.dci) : "#aac0dd";
                  const disColor = clip.dis != null ? stressColor(clip.dis) : "#aac0dd";
                  return (
                    <div key={clip.play_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="w-6 shrink-0 text-center font-mono text-[0.58rem] tabular-nums text-muted-foreground">
                        {clip.clip_index + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-mono text-xs text-foreground/80">{clip.play_id}</span>
                        <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">
                          {clip.offense_team_id ?? "—"} vs {clip.defense_team_id ?? "—"} · frames {clip.frame_start}–{clip.frame_end}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        {clip.dci != null && (
                          <span className="font-mono text-[0.6rem] font-bold tabular-nums" style={{ color: dciColor }}>
                            DCI {clip.dci.toFixed(3)}
                          </span>
                        )}
                        {clip.dis != null && (
                          <span className="font-mono text-[0.6rem] font-bold tabular-nums" style={{ color: disColor }}>
                            DIS {clip.dis.toFixed(3)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/plays/${clip.play_id}`}
                        prefetch={false}
                        className="font-mono text-[0.52rem] uppercase tracking-[0.15em] text-primary hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
