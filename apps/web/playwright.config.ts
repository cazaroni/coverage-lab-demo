import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev --hostname localhost --port 3000",
    env: {
      E2E_AUTH_BYPASS: "true",
    },
    reuseExistingServer: !process.env.CI,
    url: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
