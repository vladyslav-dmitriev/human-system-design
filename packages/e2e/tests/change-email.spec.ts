import test from "@playwright/test";

import { SettingsPage } from "../pages/settings-page";

test("change user email on settings page", async ({ page }) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await settingsPage.changeEmail("newemail@example.com");
  await settingsPage.expectEmailToBe("newemail@example.com");
});

test.afterEach(async ({ request, page }) => {
  const cookies = await page.context().cookies();

  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  await request.patch("/api/user/profile", {
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    data: { email: "vladyslav.dmitriev@gmail.com" },
  });
});
