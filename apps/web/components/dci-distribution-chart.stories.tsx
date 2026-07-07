import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DciDistributionChart } from "@/components/dci-distribution-chart";

const meta = {
  component: DciDistributionChart,
  parameters: {
    layout: "padded",
    backgrounds: { default: "canvas" },
  },
  title: "Dashboard/DCI Distribution Chart",
} satisfies Meta<typeof DciDistributionChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: [
      { bucket: "0.0–0.2", count: 18 },
      { bucket: "0.2–0.4", count: 42 },
      { bucket: "0.4–0.6", count: 61 },
      { bucket: "0.6–0.8", count: 47 },
      { bucket: "0.8–1.0", count: 24 },
    ],
  },
};

export const Sparse: Story = {
  args: {
    data: [
      { bucket: "0.0–0.2", count: 3 },
      { bucket: "0.2–0.4", count: 8 },
      { bucket: "0.4–0.6", count: 5 },
      { bucket: "0.6–0.8", count: 1 },
      { bucket: "0.8–1.0", count: 0 },
    ],
  },
};
