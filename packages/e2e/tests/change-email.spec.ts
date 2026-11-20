import { test, testIsolated, expect } from "../fixtures";
import { SettingsPage } from "../pages/settings-page";

testIsolated(
  "change email: new value is saved and shown after reload",
  async ({ page, freshUser }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await expect(settingsPage.emailInput).toHaveValue(freshUser.email);

    const newEmail = `qa-e2e-changed-${Date.now()}@example.test`;
    await settingsPage.changeEmail(newEmail);

    await expect(settingsPage.emailInput).toHaveValue(newEmail);
    await page.reload();
    await expect(settingsPage.emailInput).toHaveValue(newEmail);
  },
);

test("change email: button is disabled until the value differs", async ({
  page,
  freshUser,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  await expect(settingsPage.emailInput).toHaveValue(freshUser.email);
  await expect(settingsPage.emailButton).toBeDisabled();
});

test("change email: invalid email shows validation error", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await settingsPage.emailInput.fill("not-an-email");
  await settingsPage.emailButton.click();

  await expect(
    page
      .getByText(/email/i)
      .filter({ hasText: /invalid|некоректн|невір|valid/i }),
  ).toBeVisible();
});
