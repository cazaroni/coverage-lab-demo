import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StressResilienceTable } from "@/components/stress-resilience-table";

const meta = {
  component: StressResilienceTable,
  parameters: {
    layout: "padded",
    backgrounds: { default: "canvas" },
  },
  title: "Dashboard/Stress Resilience Table",
} satisfies Meta<typeof StressResilienceTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    rows: [
      { player_id: "43478", team_id: "team_springfield_arrows", resilience_score: 0.88, samples: 74 },
      { player_id: "29301", team_id: "team_springfield_arrows", resilience_score: 0.81, samples: 61 },
      { player_id: "37714", team_id: "team_springfield_arrows", resilience_score: 0.77, samples: 58 },
      { player_id: "50092", team_id: "team_springfield_arrows", resilience_score: 0.72, samples: 49 },
      { player_id: "61120", team_id: "team_springfield_arrows", resilience_score: 0.68, samples: 44 },
    ],
  },
};

export const MixedTiers: Story = {
  args: {
    rows: [
      { player_id: "11111", team_id: "team_springfield_arrows", resilience_score: 0.91, samples: 80 },
      { player_id: "22222", team_id: "team_springfield_arrows", resilience_score: 0.55, samples: 32 },
      { player_id: "33333", team_id: "team_springfield_arrows", resilience_score: 0.38, samples: 19 },
      { player_id: "44444", team_id: "team_springfield_arrows", resilience_score: 0.15, samples: 9 },
    ],
  },
};
