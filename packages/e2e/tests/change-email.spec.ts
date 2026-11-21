import { test, testIsolated, expect } from "../fixtures";
import { SETTINGS_TEXT, SettingsPage } from "../pages/settings-page";

testIsolated(
  "change email: new value is saved with the current password and shown after reload",
  async ({ page, freshUser }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await expect(settingsPage.emailInput).toHaveValue(freshUser.email);

    const newEmail = `qa-e2e-changed-${Date.now()}@example.test`;
    const patch = page.waitForRequest(
      (r) => r.url().endsWith("/user/profile") && r.method() === "PATCH",
    );
    // after the change the web asks for a fresh confirmation mail (no body, server makes the token)
    const verification = page.waitForRequest(
      (r) =>
        r.url().endsWith("/sender/emails/send-verification") &&
        r.method() === "POST",
    );
    await settingsPage.changeEmail(newEmail, freshUser.password);

    expect((await patch).postDataJSON()).toEqual({
      email: newEmail,
      currentPassword: freshUser.password,
    });
    expect((await verification).postData()).toBeNull();
    await expect(page.getByText(SETTINGS_TEXT.emailChanged)).toBeVisible();
    await expect(settingsPage.emailInput).toHaveValue(newEmail);
    await expect(settingsPage.emailPasswordInput).toHaveValue("");
    await page.reload();
    await expect(settingsPage.emailInput).toHaveValue(newEmail);
  },
);

test("change email: wrong current password is rejected, the email stays the same", async ({
  page,
  freshUser,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();

  await settingsPage.changeEmail(
    `qa-e2e-takeover-${Date.now()}@example.test`,
    "Wrong-current-1!",
  );

  await expect(
    page.getByText(SETTINGS_TEXT.currentPasswordWrong),
  ).toBeVisible();
  await page.reload();
  await expect(settingsPage.emailInput).toHaveValue(freshUser.email);
});

test("change email: button is disabled until the value differs", async ({
  page,
  freshUser,
}) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  await expect(settingsPage.emailInput).toHaveValue(freshUser.email);
  await expect(settingsPage.emailButton).toBeDisabled();
});

test("change email: invalid email shows a validation error and sends no request", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  let apiCalled = false;
  await page.route("**/user/profile", (route) => {
    if (route.request().method() === "PATCH") apiCalled = true;
    return route.fallback();
  });

  await settingsPage.changeEmail("not-an-email", "Whatever-1!");

  await expect(page.getByText(SETTINGS_TEXT.emailInvalid)).toBeVisible();
  expect(apiCalled).toBe(false);
});

test("change email: current password is required", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  let apiCalled = false;
  await page.route("**/user/profile", (route) => {
    if (route.request().method() === "PATCH") apiCalled = true;
    return route.fallback();
  });

  await settingsPage.emailInput.fill(`qa-e2e-new-${Date.now()}@example.test`);
  await settingsPage.emailButton.click();

  await expect(
    page.getByText(SETTINGS_TEXT.currentPasswordRequired),
  ).toBeVisible();
  expect(apiCalled).toBe(false);
});
