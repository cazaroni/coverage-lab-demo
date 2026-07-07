export const E2E_AUTH_COOKIE = "edge-e2e-auth";

export const e2eSessionFixture = {
  activeTeamId: "team_springfield_arrows",
  organizationName: "Springfield Arrows",
  organizationSlug: "springfield-arrows",
  role: "org:admin",
  sessionId: "sess_e2e_phase0",
  userId: "user_e2e_phase0",
} as const;

export function isShowcaseMode() {
  return process.env.PROJECTEDGE_SHOWCASE_MODE !== "false";
}

export function isE2EAuthBypassEnabled() {
  return isShowcaseMode() || process.env.E2E_AUTH_BYPASS === "true";
}
