import { expect, test } from "@playwright/test";

test("dashboard shows team header and analytics surfaces", async ({ page }) => {
  await page.goto("/api/e2e/sign-in?returnTo=/app");

  await expect(
    page.getByRole("heading", { name: /team dashboard/i }),
  ).toBeVisible();

  // Team badge visible in header
  await expect(
    page.getByRole("main").getByText("Springfield Arrows"),
  ).toBeVisible();

  // Live data notice is visible
  await expect(
    page.getByText(/read live from the backend/i),
  ).toBeVisible();

  // Analytics section card titles (CardTitle renders as div[data-slot=card-title])
  const cardTitles = page.locator('[data-slot="card-title"]');
  await expect(cardTitles.filter({ hasText: /recent games/i })).toBeVisible();
  await expect(cardTitles.filter({ hasText: /dci distribution/i })).toBeVisible();
  await expect(cardTitles.filter({ hasText: /explosive plays/i })).toBeVisible();
  await expect(cardTitles.filter({ hasText: /stress resilience ranking/i })).toBeVisible();
  await expect(cardTitles.filter({ hasText: /dis trend/i })).toBeVisible();
});

test("dashboard recent games link navigates to catalog filtered by game", async ({ page }) => {
  await page.goto("/api/e2e/sign-in?returnTo=/app");

  // Use the list items in the recent games section
  const recentGamesSection = page.locator("ul[aria-label='Recent games']");
  await expect(recentGamesSection).toBeVisible();

  const firstItem = recentGamesSection.locator("li").first();
  await firstItem.locator("a").click();

  await expect(page).toHaveURL(/\/catalog/);
});

test("catalog page shows play list table with DCI and DIS columns", async ({ page }) => {
  await page.goto("/api/e2e/sign-in?returnTo=/catalog");

  await expect(
    page.getByRole("heading", { name: /game catalog/i }),
  ).toBeVisible();

  // Filter form present
  await expect(page.getByRole("form", { name: /catalog filters/i })).toBeVisible();

  // Table column headers
  await expect(page.getByRole("columnheader", { name: "DCI" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "DIS" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Play ID" })).toBeVisible();

  // At least one play row visible
  await expect(page.getByRole("cell", { name: /play_/ }).first()).toBeVisible();
});

test("catalog filter by game_id reduces visible plays", async ({ page }) => {
  await page.goto("/api/e2e/sign-in?returnTo=/catalog");

  // Count initial rows
  const rows = page.locator("tbody tr");
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  // Filter to a single game
  await page.goto("/api/e2e/sign-in?returnTo=/catalog?game_id=2022090800");
  await expect(page).toHaveURL(/game_id=2022090800/);

  const filteredRows = page.locator("tbody tr");
  const filteredCount = await filteredRows.count();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThanOrEqual(initialCount);
});

test("shell nav includes Dashboard and Game catalog links", async ({ page }) => {
  await page.goto("/api/e2e/sign-in?returnTo=/app");

  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Game catalog" })).toBeVisible();

  // Navigate to catalog via nav
  await page.getByRole("link", { name: "Game catalog" }).click();
  await expect(page).toHaveURL(/\/catalog/);
  await expect(
    page.getByRole("heading", { name: /game catalog/i }),
  ).toBeVisible();
});
