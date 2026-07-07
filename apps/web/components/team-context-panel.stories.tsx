import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TeamContextPanel } from "@/components/team-context-panel";

const meta = {
  component: TeamContextPanel,
  parameters: {
    layout: "fullscreen",
  },
  title: "Surfaces/Team Context Panel",
} satisfies Meta<typeof TeamContextPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MultipleMemberships: Story = {
  args: {
    actionLabel: "Activate team",
    description:
      "Every authenticated session must operate inside exactly one active team_id context.",
    emptyDescription:
      "Create or join a team so the app can establish exactly one active team context.",
    emptyTitle: "No team is active yet",
    isAutoResolving: false,
    isLoading: false,
    managementSlot: (
      <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-muted-foreground">
        Clerk organization management slot
      </div>
    ),
    memberships: [
      {
        id: "team_springfield_arrows",
        name: "Springfield Arrows",
        role: "org:admin",
        slug: "springfield-arrows",
      },
      {
        id: "team_redwood_falcons",
        name: "Redwood Falcons",
        role: "org:member",
        slug: "redwood-falcons",
      },
    ],
    roleLabel: "Role",
    title: "Resolve your active team context",
  },
};
