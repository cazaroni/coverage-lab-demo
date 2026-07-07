import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PlayThumbnail } from "@/components/play-thumbnail";

const meta = {
  component: PlayThumbnail,
  parameters: {
    layout: "centered",
    backgrounds: { default: "canvas" },
  },
  title: "Catalog/Play Thumbnail",
} satisfies Meta<typeof PlayThumbnail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoThumbnail: Story = {
  args: {
    play: { play_id: "play_0100", thumbnail_url: null },
    className: "h-20 w-28 rounded-xl",
  },
};

export const WithThumbnail: Story = {
  args: {
    play: {
      play_id: "play_0200",
      thumbnail_url: "https://placehold.co/112x80/0f5d43/37d0b6?text=play",
    },
    className: "h-20 w-28 rounded-xl",
  },
};
