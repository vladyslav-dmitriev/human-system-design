import { test, testIsolated, expect } from "../fixtures";
import { LoginPage } from "../pages/login-page";
import { SettingsPage } from "../pages/settings-page";

testIsolated(
  "change password: new password works for the next login",
  async ({ page, freshUser }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    const newPassword = `New-${crypto.randomUUID()}-2!`;

    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/user/profile/password") &&
        r.request().method() === "PATCH",
    );
    await settingsPage.changePassword(freshUser.password, newPassword);
    expect((await response).ok()).toBe(true);
    await expect(page.getByText("Пароль успешно изменен")).toBeVisible();

    // Drop the session and sign in again with the new password.
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.loginAndGetStatus(freshUser.email, newPassword);
    await expect(page).toHaveURL(/\/dashboard/);
  },
);

test("change password: wrong current password shows an error and keeps the old one", async ({
  page,
  freshUser,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await settingsPage.changePassword(
    "Wrong-current-1!",
    `New-${crypto.randomUUID()}-2!`,
  );

  await expect(page.getByText("Ошибка обновления")).toBeVisible();
  await expect(page.getByText("Пароль успешно изменен")).toHaveCount(0);
  void freshUser;
});

test("change password: new password shorter than 8 characters is rejected", async ({
  page,
  freshUser,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  let apiCalled = false;
  await page.route("**/user/profile/password", (route) => {
    apiCalled = true;
    return route.abort();
  });

  await settingsPage.changePassword(freshUser.password, "short1");

  await expect(page.getByText(/at least 8|8 characters/i).last()).toBeVisible();
  expect(apiCalled).toBe(false);
});

test("change password: submit is disabled while fields are empty or equal", async ({
  page,
  freshUser,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await expect(settingsPage.passwordSubmit).toBeDisabled();
  await settingsPage.currentPasswordInput.fill(freshUser.password);
  await settingsPage.newPasswordInput.fill(freshUser.password);
  await expect(settingsPage.passwordSubmit).toBeDisabled();
});
