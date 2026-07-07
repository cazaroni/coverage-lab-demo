import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ExplosivePlaysList } from "@/components/explosive-plays-list";

const meta = {
  component: ExplosivePlaysList,
  parameters: {
    layout: "padded",
    backgrounds: { default: "canvas" },
  },
  title: "Dashboard/Explosive Plays List",
} satisfies Meta<typeof ExplosivePlaysList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    plays: [
      { play_id: "play_1014", game_id: "2022090800", preceding_dis: 0.71, explosive_gain_yards: 42 },
      { play_id: "play_0882", game_id: "2022091100", preceding_dis: 0.68, explosive_gain_yards: 38 },
      { play_id: "play_1203", game_id: "2022091800", preceding_dis: 0.65, explosive_gain_yards: 31 },
      { play_id: "play_0411", game_id: "2022092500", preceding_dis: 0.63, explosive_gain_yards: 28 },
    ],
  },
};

export const NoYardageData: Story = {
  args: {
    plays: [
      { play_id: "play_0100", game_id: "2022090800", preceding_dis: 0.55, explosive_gain_yards: null },
      { play_id: "play_0200", game_id: "2022090800", preceding_dis: 0.48, explosive_gain_yards: null },
    ],
  },
};
