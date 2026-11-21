import { test, expect } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LoginPage } from "../pages/login-page";
import { SettingsPage } from "../pages/settings-page";

// BUG: см. FIX.md "Sign out не завершает сессию (cookie next-auth.session-token остаётся)" [L3]
// Intermittent (about 3 of 4 runs): POST /api/auth/signout answers 200 but the session cookie
// stays, the user lands on /dashboard or /settings still signed in.
test.fixme("logout: Sign out ends the session and protected pages redirect to login", async ({
  page,
}) => {
  const { email, password } = getE2eCredentials();
  await new LoginPage(page).loginAndGetStatus(email, password);
  await page.waitForURL("**/dashboard");
  await new SettingsPage(page).goto();

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login/);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.includes("session-token"))).toBe(false);

  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
