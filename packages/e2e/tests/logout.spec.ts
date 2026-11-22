import { testIsolated as test, expect } from "../fixtures";
import { SettingsPage } from "../pages/settings-page";

// Fixed in wave 1 (FIX.md "Sign out не завершает сессию"): Logout awaits
// signOut({ redirect: false }) and only then navigates to the localized login page.
// The bug was intermittent, so a stack run (several repetitions) is needed to confirm.
// Sign out revokes ALL sessions of the user on the API (session version in Redis), so the test uses its
// own freshly registered user: signing out the shared E2E_USER would log out the `authenticated` projects.
test("logout: Sign out ends the session and protected pages redirect to login", async ({
  page,
}) => {
  await new SettingsPage(page).goto();

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/en\/login/);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.includes("session-token"))).toBe(false);

  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/login/);
});
