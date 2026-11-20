import { test, expect } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LoginPage } from "../pages/login-page";
import { SettingsPage } from "../pages/settings-page";

// Signs in through the UI in its own context: with a session restored from storageState the
// session cookie was not cleared by Sign out in our runs, so the real login flow is used here.
test("logout: Sign out ends the session and protected pages redirect to login", async ({
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
