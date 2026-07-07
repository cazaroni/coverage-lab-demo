import type { PlayListRow } from "@projectedge/schemas";

import Link from "next/link";

import { PlayThumbnail } from "@/components/play-thumbnail";
import { Badge } from "@/components/ui/badge";
import { dciAccentClass, disAccentClass } from "@/lib/scoreLabels";

type Props = {
  plays: PlayListRow[];
  labels: {
    playId: string;
    game: string;
    week: string;
    dci: string;
    dis: string;
    offense: string;
    defense: string;
    noResults: string;
  };
};

export function PlayListTable({ plays, labels }: Props) {
  if (plays.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/5 px-6 py-10 text-center text-sm text-muted-foreground">
        {labels.noResults}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="w-12 p-0" />
            <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.playId}
            </th>
            <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.game}
            </th>
            <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.week}
            </th>
            <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.dci}
            </th>
            <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.dis}
            </th>
            <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.offense}
            </th>
            <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.defense}
            </th>
          </tr>
        </thead>
        <tbody>
          {plays.map((play, idx) => (
            <tr
              key={play.play_id}
              className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx % 2 === 0 ? "" : "bg-white/2"}`}
            >
              <td className="p-0">
                <PlayThumbnail
                  play={play}
                  className="h-10 w-12 rounded-none object-cover"
                />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/catalog/${play.play_id}`}
                  prefetch={false}
                  className="font-mono text-foreground hover:text-primary hover:underline"
                >
                  {play.play_id}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {play.game_id}
              </td>
              <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">
                {play.week}
              </td>
              <td className={`px-4 py-3 text-right font-mono font-medium ${dciAccentClass(play.dci)}`}>
                {play.dci !== null ? play.dci.toFixed(2) : "-"}
              </td>
              <td className={`px-4 py-3 text-right font-mono font-medium ${disAccentClass(play.dis)}`}>
                {play.dis !== null ? play.dis.toFixed(2) : "-"}
              </td>
              <td className="px-4 py-3 text-center">
                {play.offense_team_id ? (
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-widest">
                    {play.offense_team_id}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {play.defense_team_id ? (
                  <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-widest">
                    {play.defense_team_id}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
