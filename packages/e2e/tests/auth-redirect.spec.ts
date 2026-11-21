import { test, expect, type Page } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LoginPage } from "../pages/login-page";

const callbackUrl = (page: Page) =>
  new URL(page.url()).searchParams.get("callbackUrl");

// The proxy sends a guest to /<locale>/login?callbackUrl=<requested path without locale>.
for (const path of [
  "dashboard",
  "settings",
  "billing",
  "todos",
  "pricing",
  "checkout",
  "thank-you-payment",
]) {
  test(`guest on /en/${path} is redirected to the en login with callbackUrl`, async ({
    page,
  }) => {
    await page.goto(`/en/${path}`);

    await expect(page).toHaveURL(/\/en\/login\?/);
    expect(callbackUrl(page)).toBe(`/${path}`);
  });
}

// Fixed in wave 1 (FIX.md "/checkout не защищён middleware").
test("guest on /en/checkout with params is redirected to login and the params are kept", async ({
  page,
}) => {
  const target =
    "/checkout?priceId=price_test&type=subscription&billingOperation=purchase";
  await page.goto(`/en${target}`);

  await expect(page).toHaveURL(/\/en\/login\?/);
  expect(callbackUrl(page)).toBe(target);
});

// Fixed in wave 1 (FIX.md "Редирект на /login теряет локаль").
test("guest on /uk/dashboard is redirected to the uk login page", async ({
  page,
}) => {
  await page.goto("/uk/dashboard");

  await expect(page).toHaveURL(/\/uk\/login\?/);
  expect(callbackUrl(page)).toBe("/dashboard");
});

test("guest on a nested protected path keeps the query string in callbackUrl", async ({
  page,
}) => {
  await page.goto("/en/settings/security?tab=2fa");

  await expect(page).toHaveURL(/\/en\/login\?/);
  expect(callbackUrl(page)).toBe("/settings/security?tab=2fa");
});

test("a path that only starts like a protected one is not protected (/pricing-info)", async ({
  page,
}) => {
  const response = await page.goto("/en/pricing-info");

  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(/\/en\/pricing-info$/);
});

test("the removed dev page /en/test is not served", async ({ page }) => {
  const response = await page.goto("/en/test");

  expect(response?.status()).toBe(404);
});

// Fixed in wave 1 (FIX.md "После входа нет возврата на запрошенную страницу").
test("after login the user returns to the originally requested page", async ({
  page,
}) => {
  const { email, password } = getE2eCredentials();
  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/en\/login\?/);

  // stay on the redirected URL: it carries the callbackUrl
  await new LoginPage(page).loginAndGetStatus(email, password, {
    keepUrl: true,
  });

  await expect(page).toHaveURL(/\/en\/settings$/);
});

test("an external callbackUrl is ignored after login (no open redirect)", async ({
  page,
}) => {
  const { email, password } = getE2eCredentials();
  const loginPage = new LoginPage(page);
  await page.goto(
    `/en/login?callbackUrl=${encodeURIComponent("https://evil.example/phish")}`,
  );

  await loginPage.loginAndGetStatus(email, password, { keepUrl: true });

  await expect(page).toHaveURL(/\/en\/dashboard$/);
});
