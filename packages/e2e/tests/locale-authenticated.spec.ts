import { test, expect } from "@playwright/test";

import { SettingsPage } from "../pages/settings-page";
import { HeaderPage } from "../pages/header-page";

test("locale: switching language on settings keeps the page and translates it", async ({
  page,
}) => {
  await new SettingsPage(page).goto();
  const header = new HeaderPage(page);

  await header.selectLanguage("UA");

  await expect(page).toHaveURL(/\/uk\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Налаштування" }),
  ).toBeVisible();
});

test("login page redirects a signed-in user to the dashboard", async ({
  page,
}) => {
  await page.goto("/en/login");

  await expect(page).toHaveURL(/\/dashboard$/);
});
