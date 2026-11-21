import { test, expect } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LoginPage } from "../pages/login-page";

test("login: valid credentials open the dashboard", async ({ page }) => {
  const { email, password } = getE2eCredentials();
  const loginPage = new LoginPage(page);

  await loginPage.loginAndGetStatus(email, password);

  await expect(page).toHaveURL(/\/en\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("login: empty fields are blocked by native validation and send no request", async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  let apiCalled = false;
  await page.route("**/service-auth/login", (route) => {
    apiCalled = true;
    return route.abort();
  });

  await loginPage.loginButton.click();

  await expect(loginPage.emailInput).toHaveJSProperty(
    "validity.valueMissing",
    true,
  );
  await expect(page).toHaveURL(/\/login/);
  expect(apiCalled).toBe(false);
});

test("login: invalid email format is blocked by native validation", async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.login("not-an-email", "whatever-123");

  await expect(loginPage.emailInput).toHaveJSProperty(
    "validity.typeMismatch",
    true,
  );
});

// BUG: см. FIX.md "Неверный пароль при логине: пустой ответ API, форма зависает" [L3]
// API answers 201 with an empty body, response.json() throws and the form hangs without an error.
test.fixme("login: wrong password keeps the user on login and shows an error", async ({
  page,
}) => {
  const { email } = getE2eCredentials();
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.login(email, "Wrong-password-123");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("form p.text-destructive")).toBeVisible();
  await expect(loginPage.loginButton).toBeEnabled();
});

test("login: wrong password never creates a session", async ({ page }) => {
  const { email } = getE2eCredentials();
  const loginPage = new LoginPage(page);

  await loginPage.loginAndGetStatus(email, "Wrong-password-123");

  await expect(page).toHaveURL(/\/login/);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.includes("session-token"))).toBe(false);
});

test("login: links lead to forgot-password and create-account", async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.forgotPasswordLink.click();

  await expect(page).toHaveURL(/\/forgot-password/);
});
