import { test, expect } from "@playwright/test";

import { SettingsPage } from "../pages/settings-page";

test("settings page need to be accessible", async ({ page }) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await expect(page).toHaveURL(/.*settings/);
  await expect(page.getByText("Settings")).toBeVisible();
});
