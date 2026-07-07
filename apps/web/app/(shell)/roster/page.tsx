import { BackendUnavailableCallout } from "@/components/backend-unavailable-callout";
import { RosterFilterBar } from "@/components/roster/roster-filter-bar";
import { TeamHeader } from "@/components/roster/team-header";
import { getApiBase } from "@/lib/api-client";
import { fetchRosterPlayers } from "@/lib/roster-reads";
import { requireActiveTeamSession } from "@/lib/session";

export const metadata = { title: "Team roster" };

export default async function RosterPage() {
  await requireActiveTeamSession();
  const apiBase = getApiBase();
  const { players, team, apiUnavailable } = await fetchRosterPlayers();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {apiUnavailable && (
        <BackendUnavailableCallout
          apiBase={apiBase}
          title="Live roster unavailable"
          body="Showing fixture data. Start the full stack with pnpm dev to load live roster from the backend."
        />
      )}

      <TeamHeader team={team} />

      <RosterFilterBar
        players={players}
        labels={{ noPlayers: "No players match the active filter." }}
      />
    </div>
  );
}
