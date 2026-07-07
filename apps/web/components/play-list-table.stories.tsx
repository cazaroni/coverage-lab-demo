import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PlayListTable } from "@/components/play-list-table";

const TABLE_LABELS = {
  playId: "Play ID",
  game: "Game",
  week: "Wk",
  dci: "DCI",
  dis: "DIS",
  offense: "OFF",
  defense: "DEF",
  noResults: "No plays match the current filters.",
};

const meta = {
  component: PlayListTable,
  parameters: {
    layout: "padded",
    backgrounds: { default: "canvas" },
  },
  title: "Catalog/Play List Table",
} satisfies Meta<typeof PlayListTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    labels: TABLE_LABELS,
    plays: [
      { play_id: "play_0100", game_id: "2022090800", season: 2022, week: 1, dci: 0.82, dis: 0.61, offense_team_id: "KC", defense_team_id: "ARI", thumbnail_url: null },
      { play_id: "play_0210", game_id: "2022090800", season: 2022, week: 1, dci: 0.75, dis: 0.54, offense_team_id: "ARI", defense_team_id: "KC", thumbnail_url: null },
      { play_id: "play_0337", game_id: "2022090800", season: 2022, week: 1, dci: 0.91, dis: 0.73, offense_team_id: "KC", defense_team_id: "ARI", thumbnail_url: null },
    ],
  },
};

export const Empty: Story = {
  args: {
    labels: TABLE_LABELS,
    plays: [],
  },
};

export const NullMetrics: Story = {
  args: {
    labels: TABLE_LABELS,
    plays: [
      { play_id: "play_0001", game_id: "2022090800", season: 2022, week: 1, dci: null, dis: null, offense_team_id: null, defense_team_id: null, thumbnail_url: null },
    ],
  },
};
