import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AppShellFrame } from "@/components/app-shell-frame";

const meta = {
  component: AppShellFrame,
  parameters: {
    layout: "fullscreen",
  },
  title: "Surfaces/App Shell Frame",
} satisfies Meta<typeof AppShellFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    accountSlot: (
      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
        Account controls
      </div>
    ),
    children: (
      <div className="rounded-[2rem] border border-white/10 bg-card/90 p-6 text-foreground">
        Storybook preview content inside the branded shell.
      </div>
    ),
    navItems: [
      {
        href: "/app",
        label: "App shell",
      },
      {
        href: "/session",
        label: "Session",
      },
    ],
    teamId: "team_springfield_arrows",
    teamName: "Springfield Arrows",
  },
};
