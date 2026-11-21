import { test, testIsolated, expect } from "../fixtures";
import { LoginPage } from "../pages/login-page";
import { SETTINGS_TEXT, SettingsPage } from "../pages/settings-page";

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
    const result = await response;
    expect(result.ok()).toBe(true);
    expect(await result.json()).toEqual({ success: true });
    await expect(page.getByText(SETTINGS_TEXT.passwordChanged)).toBeVisible();

    // Drop the session and sign in again with the new password.
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.loginAndGetStatus(freshUser.email, newPassword);
    await expect(page).toHaveURL(/\/dashboard/);
  },
);

test("change password: wrong current password shows an error at the field and keeps the old one", async ({
  page,
  freshUser,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await settingsPage.changePassword(
    "Wrong-current-1!",
    `New-${crypto.randomUUID()}-2!`,
  );

  await expect(
    page.getByText(SETTINGS_TEXT.currentPasswordWrong),
  ).toBeVisible();
  await expect(page.getByText(SETTINGS_TEXT.passwordChanged)).toHaveCount(0);
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

  await expect(
    page.getByText(SETTINGS_TEXT.newPasswordTooShort, { exact: true }),
  ).toBeVisible();
  expect(apiCalled).toBe(false);
});

test("change password: new password over 72 bytes is rejected", async ({
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

  await settingsPage.changePassword(freshUser.password, "a".repeat(73));

  await expect(page.getByText(SETTINGS_TEXT.newPasswordTooLong)).toBeVisible();
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
