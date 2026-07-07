import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthSurfaceFrame } from "@/components/auth-surface-frame";

const meta = {
  component: AuthSurfaceFrame,
  parameters: {
    layout: "fullscreen",
  },
  title: "Surfaces/Auth Surface Frame",
} satisfies Meta<typeof AuthSurfaceFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignInSurface: Story = {
  args: {
    description:
      "No account needed — this is a public demo. One click drops you into a live team workspace with sample analytics.",
    eyebrow: "Coverage Lab",
    footerNote: "Coverage Lab — a football analytics demo.",
    panelSlot: (
      <div className="w-full max-w-md rounded-[1.5rem] border border-white/8 bg-white/5 p-6 text-center text-sm text-muted-foreground">
        Demo access placeholder
      </div>
    ),
    title: "Enter the Coverage Lab demo",
  },
};
