import { test, expect } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LoginPage } from "../pages/login-page";
import { SettingsPage } from "../pages/settings-page";

// Fixed in wave 1 (FIX.md "Sign out не завершает сессию"): Logout awaits
// signOut({ redirect: false }) and only then navigates to the localized login page.
// The bug was intermittent, so a stack run (several repetitions) is needed to confirm.
test("logout: Sign out ends the session and protected pages redirect to login", async ({
  page,
}) => {
  const { email, password } = getE2eCredentials();
  await new LoginPage(page).loginAndGetStatus(email, password);
  await page.waitForURL("**/dashboard");
  await new SettingsPage(page).goto();

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/en\/login/);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.includes("session-token"))).toBe(false);

  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/login/);
});
