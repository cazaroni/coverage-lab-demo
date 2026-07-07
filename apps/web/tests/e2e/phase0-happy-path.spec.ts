import { expect, test } from "@playwright/test";

test("public auth route is reachable", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /a branded, authenticated shell for football teams from day zero/i,
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("heading", { name: /enter the coverage lab demo/i }),
  ).toBeVisible();
});

test("e2e bypass reaches the branded app shell and session echo", async ({
  page,
}) => {
  await page.goto("/api/e2e/sign-in?returnTo=/app");

  await expect(
    page.getByRole("heading", { name: /team dashboard/i }),
  ).toBeVisible();
  // Team name appears as a badge in main alongside the dashboard heading
  await expect(
    page.getByRole("main").getByText("Springfield Arrows"),
  ).toBeVisible();

  await page.getByRole("link", { exact: true, name: "Session" }).click();

  await expect(
    page.getByRole("heading", { name: /authenticated session echo/i }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText("active_team_id")).toBeVisible();
  await expect(
    page.getByRole("main").getByText("team_springfield_arrows"),
  ).toBeVisible();
});
