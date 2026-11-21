import { test, expect } from "@playwright/test";

import { HeaderPage } from "../pages/header-page";
import { waitForPageReady } from "../pages/helpers";

test("locale: switching to UA keeps the login page and translates it", async ({
  page,
}) => {
  await page.goto("/en/login");
  await waitForPageReady(page);
  const header = new HeaderPage(page);

  await header.selectLanguage("UA");

  await expect(page).toHaveURL(/\/uk\/login$/);
  await expect(page.getByRole("button", { name: "Увійти" })).toBeVisible();
});

test("locale: switching back to EN keeps the page", async ({ page }) => {
  await page.goto("/uk/login");
  await waitForPageReady(page);
  const header = new HeaderPage(page);

  await header.selectLanguage("EN");

  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("locale: <html lang> follows the locale of the page", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/uk/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
});

test("locale: unsupported locale falls back to the not-found page", async ({
  page,
}) => {
  const response = await page.goto("/de/login");

  expect(response?.status()).toBe(404);
});
