import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DisTrendSparkline } from "@/components/dis-trend-sparkline";

const meta = {
  component: DisTrendSparkline,
  parameters: {
    layout: "padded",
    backgrounds: { default: "canvas" },
  },
  title: "Dashboard/DIS Trend Sparkline",
} satisfies Meta<typeof DisTrendSparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rising: Story = {
  args: {
    data: [
      { team_id: "team_springfield_arrows", week: 1, observed_on: "2022-09-08", dis_average: 0.44 },
      { team_id: "team_springfield_arrows", week: 2, observed_on: "2022-09-15", dis_average: 0.47 },
      { team_id: "team_springfield_arrows", week: 3, observed_on: "2022-09-22", dis_average: 0.51 },
      { team_id: "team_springfield_arrows", week: 4, observed_on: "2022-09-29", dis_average: 0.49 },
      { team_id: "team_springfield_arrows", week: 5, observed_on: "2022-10-06", dis_average: 0.55 },
      { team_id: "team_springfield_arrows", week: 6, observed_on: "2022-10-13", dis_average: 0.58 },
    ],
  },
};

export const Falling: Story = {
  args: {
    data: [
      { team_id: "team_springfield_arrows", week: 1, observed_on: "2022-09-08", dis_average: 0.65 },
      { team_id: "team_springfield_arrows", week: 2, observed_on: "2022-09-15", dis_average: 0.60 },
      { team_id: "team_springfield_arrows", week: 3, observed_on: "2022-09-22", dis_average: 0.54 },
      { team_id: "team_springfield_arrows", week: 4, observed_on: "2022-09-29", dis_average: 0.48 },
    ],
  },
};
