import { test, expect } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LoginPage } from "../pages/login-page";

for (const path of ["dashboard", "settings", "billing", "todos", "pricing"]) {
  test(`guest on /en/${path} is redirected to login`, async ({ page }) => {
    await page.goto(`/en/${path}`);

    await expect(page).toHaveURL(/\/en\/login$/);
  });
}

// BUG: см. FIX.md "/checkout не защищён middleware" [L3]
// /checkout is not in ROUTES.protected, guest gets a blank page
test.fixme("guest on /en/checkout with params is redirected to login", async ({
  page,
}) => {
  await page.goto(
    "/en/checkout?priceId=price_test&type=subscription&billingOperation=purchase",
  );

  await expect(page).toHaveURL(/\/login/);
});

test("guest on /en/checkout without params is sent to the home page", async ({
  page,
}) => {
  await page.goto("/en/checkout");

  await expect(page).toHaveURL(/\/en\/?$/);
});

// BUG: см. FIX.md "Редирект на /login теряет локаль" [L3]
// middleware redirects to /login without locale prefix, uk user lands on /en/login
test.fixme("guest on /uk/dashboard is redirected to the uk login page", async ({
  page,
}) => {
  await page.goto("/uk/dashboard");

  await expect(page).toHaveURL(/\/uk\/login$/);
});

// BUG: см. FIX.md "После входа нет возврата на запрошенную страницу" [L3]
// no callbackUrl: login always opens /dashboard
test.fixme("after login the user returns to the originally requested page", async ({
  page,
}) => {
  const { email, password } = getE2eCredentials();
  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/login/);
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);

  await expect(page).toHaveURL(/\/settings/);
});
