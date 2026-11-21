import { test, expect } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LOGIN_TEXT, LoginPage } from "../pages/login-page";

const hasSessionCookie = async (page: import("@playwright/test").Page) =>
  (await page.context().cookies()).some((c) =>
    c.name.includes("session-token"),
  );

test("login: valid credentials open the dashboard", async ({ page }) => {
  const { email, password } = getE2eCredentials();
  const loginPage = new LoginPage(page);

  await loginPage.loginAndGetStatus(email, password);

  await expect(page).toHaveURL(/\/en\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("login: empty fields show inline errors and send no request", async ({
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

  await expect(page.getByText(LOGIN_TEXT.emailEmpty)).toBeVisible();
  await expect(page.getByText(LOGIN_TEXT.passwordRequired)).toBeVisible();
  await expect(loginPage.emailInput).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/login/);
  expect(apiCalled).toBe(false);
});

test("login: invalid email format shows an inline error and sends no request", async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  let apiCalled = false;
  await page.route("**/service-auth/login", (route) => {
    apiCalled = true;
    return route.abort();
  });

  await loginPage.login("not-an-email", "whatever-123");

  await expect(page.getByText(LOGIN_TEXT.emailInvalid)).toBeVisible();
  expect(apiCalled).toBe(false);
});

// Fixed in wave 1 (FIX.md "Неверный пароль при логине": API answers 401 with a JSON error,
// the form shows the message and unlocks). Needs a stack run to confirm.
test("login: wrong password keeps the user on login, shows an error and creates no session", async ({
  page,
}) => {
  const { email } = getE2eCredentials();
  const loginPage = new LoginPage(page);

  const status = await loginPage.loginAndGetStatus(email, "Wrong-password-123");

  expect(status).toBe(401);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(LOGIN_TEXT.invalidCredentials)).toBeVisible();
  await expect(loginPage.loginButton).toBeEnabled();
  expect(await hasSessionCookie(page)).toBe(false);
});

test("login: forgot-password link and OAuth buttons are hidden, create-account link works", async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await expect(loginPage.forgotPasswordLink).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /google|github/i }),
  ).toHaveCount(0);

  await loginPage.createAccountLink.click();

  await expect(page).toHaveURL(/\/en\/create-account/);
});

// Two-factor sign-in is covered with a mocked API: no SMS is ever sent.
test.describe("login with two-factor authentication (API mocked)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/service-auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          twoFactorRequired: true,
          phoneMasked: "**********67",
        }),
      }),
    );
  });

  test("password step shows the OTP step with the masked phone and no session yet", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login("qa-e2e-mock@example.test", "Mock-password-1!");

    await expect(
      page.getByText(`${LOGIN_TEXT.otpHint} **********67`),
    ).toBeVisible();
    await expect(loginPage.otpInput).toBeVisible();
    await expect(loginPage.verifyButton).toBeDisabled();
    expect(await hasSessionCookie(page)).toBe(false);

    await loginPage.backToLoginButton.click();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test("wrong code: verify-otp gets only email and code, the error is shown, no session", async ({
    page,
  }) => {
    await page.route("**/service-auth/verify-otp", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 400,
          message: "Invalid or expired code",
          error: "Bad Request",
          code: "AUTH_INVALID_OTP",
        }),
      }),
    );
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("qa-e2e-mock@example.test", "Mock-password-1!");
    await expect(loginPage.otpInput).toBeVisible();

    await loginPage.otpInput.fill("000000");
    const request = page.waitForRequest("**/service-auth/verify-otp");
    await loginPage.verifyButton.click();

    // the password is NOT sent again: it was verified at the first step
    expect((await request).postDataJSON()).toEqual({
      email: "qa-e2e-mock@example.test",
      code: "000000",
    });
    await expect(page.getByText(LOGIN_TEXT.invalidOtp)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    expect(await hasSessionCookie(page)).toBe(false);
  });
});

test("login: throttled API (429) shows a rate-limit message and unlocks the form", async ({
  page,
}) => {
  await page.route("**/service-auth/login", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 429,
        message: "ThrottlerException: Too Many Requests",
        error: "Too Many Requests",
        code: "RATE_LIMITED",
      }),
    }),
  );
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.login("qa-e2e-mock@example.test", "Mock-password-1!");

  await expect(page.getByText(LOGIN_TEXT.rateLimited)).toBeVisible();
  await expect(loginPage.loginButton).toBeEnabled();
});
