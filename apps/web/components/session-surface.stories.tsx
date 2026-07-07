import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SessionSurface } from "@/components/session-surface";

const meta = {
  component: SessionSurface,
  parameters: {
    layout: "fullscreen",
  },
  title: "Surfaces/Session Surface",
} satisfies Meta<typeof SessionSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    contractRows: [
      { label: "user_id", value: "user_e2e_phase0" },
      { label: "active_team_id", value: "team_springfield_arrows" },
      { label: "role", value: "org:admin" },
      { label: "session_id", value: "sess_e2e_phase0" },
    ],
    detailRows: [
      { label: "organization_name", value: "Springfield Arrows" },
      { label: "organization_slug", value: "springfield-arrows" },
      { label: "source", value: "frontend e2e fixture" },
    ],
    notes: [
      "This surface renders the backend-owned SessionContext field names directly.",
      "Exactly one active team context is required before the shell or session route can render.",
      "The route is intentionally limited to auth and naming validation for Phase 0.",
    ],
    subtitle:
      "Core SessionContext fields are rendered with Clerk-backed auth state and the active organization.",
    title: "Authenticated session echo",
  },
};
