import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecentGamesList } from "@/components/recent-games-list";

const meta = {
  component: RecentGamesList,
  parameters: {
    layout: "padded",
    backgrounds: { default: "canvas" },
  },
  title: "Dashboard/Recent Games List",
} satisfies Meta<typeof RecentGamesList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    games: [
      { game_id: "2022090800", season: 2022, week: 1, home_team_abbr: "KC", away_team_abbr: "ARI", home_score: 44, away_score: 21, play_count: 142 },
      { game_id: "2022091100", season: 2022, week: 1, home_team_abbr: "LA", away_team_abbr: "BUF", home_score: 31, away_score: 10, play_count: 136 },
      { game_id: "2022091800", season: 2022, week: 2, home_team_abbr: "SF", away_team_abbr: "SEA", home_score: 27, away_score: 7, play_count: 128 },
    ],
  },
};

export const NullScores: Story = {
  args: {
    games: [
      { game_id: "2022090800", season: 2022, week: 1, home_team_abbr: null, away_team_abbr: null, home_score: null, away_score: null, play_count: 0 },
    ],
  },
};
