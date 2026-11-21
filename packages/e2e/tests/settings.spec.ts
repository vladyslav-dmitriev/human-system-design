import { test, expect } from "@playwright/test";

import { SettingsPage } from "../pages/settings-page";

test("settings page need to be accessible", async ({ page }) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await expect(page).toHaveURL(/.*settings/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("settings page does not show the hidden OAuth connections", async ({
  page,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await expect(page.getByText("Linked Accounts")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Connect" })).toHaveCount(0);
});
