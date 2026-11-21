import { test, expect } from "@playwright/test";

import {
  CREATE_ACCOUNT_TEXT as TEXT,
  CreateAccountPage,
} from "../pages/create-account-page";

test("create account: valid data signs the new user in and opens dashboard; email is sent normalized", async ({
  page,
}) => {
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();
  const email = `qa-e2e-${Date.now()}@example.test`;
  const request = page.waitForRequest("**/service-auth/register");

  await createAccountPage.createAccount(
    "QA E2E",
    `  ${email.toUpperCase().replace("@EXAMPLE.TEST", "@Example.test")} `,
    `Qa-${crypto.randomUUID()}-1!`,
  );

  expect((await request).postDataJSON()).toMatchObject({
    name: "QA E2E",
    email,
    locale: "en",
  });
  await expect(page).toHaveURL(/\/dashboard/);
});

test("create account: empty form shows inline errors and sends no request", async ({
  page,
}) => {
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();
  let apiCalled = false;
  await page.route("**/service-auth/register", (route) => {
    apiCalled = true;
    return route.abort();
  });

  await createAccountPage.createAccountButton.click();

  await expect(page).toHaveURL(/\/create-account/);
  await expect(page.getByText(TEXT.nameRequired)).toBeVisible();
  await expect(page.getByText(TEXT.emailEmpty)).toBeVisible();
  await expect(page.getByText(TEXT.passwordRequired)).toBeVisible();
  await expect(createAccountPage.nameInput).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(apiCalled).toBe(false);
});

test("create account: short password is rejected on the client (8 characters minimum)", async ({
  page,
}) => {
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();
  let apiCalled = false;
  await page.route("**/service-auth/register", (route) => {
    apiCalled = true;
    return route.abort();
  });

  await createAccountPage.createAccount("QA E2E", "qa-e2e@example.test", "a");

  await expect(page.getByText(TEXT.passwordTooShort)).toBeVisible();
  expect(apiCalled).toBe(false);
});

test("create account: password over 72 bytes is rejected on the client", async ({
  page,
}) => {
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();
  let apiCalled = false;
  await page.route("**/service-auth/register", (route) => {
    apiCalled = true;
    return route.abort();
  });

  await createAccountPage.createAccount(
    "QA E2E",
    "qa-e2e@example.test",
    "a".repeat(73),
  );

  await expect(page.getByText(TEXT.passwordTooLong)).toBeVisible();
  expect(apiCalled).toBe(false);
});

// Fixed in wave 1 (FIX.md: infinite spinner on a registration error). API is mocked:
// the same behaviour for real duplicates is covered by api/test/auth.e2e-spec.ts.
test("create account: taken email (409 AUTH_EMAIL_TAKEN) shows a message and unlocks the form", async ({
  page,
}) => {
  await page.route("**/service-auth/register", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 409,
        message: "Email is already registered",
        error: "Conflict",
        code: "AUTH_EMAIL_TAKEN",
      }),
    }),
  );
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();

  await createAccountPage.createAccount(
    "QA E2E",
    "qa-e2e-taken@example.test",
    "Qa-password-1!",
  );

  await expect(page.getByText(TEXT.emailTaken)).toBeVisible();
  await expect(createAccountPage.createAccountButton).toBeEnabled();
  await expect(page).toHaveURL(/\/create-account/);
});

test("create account: server error (500) shows a generic message instead of hanging", async ({
  page,
}) => {
  await page.route("**/service-auth/register", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 500,
        message: "Internal server error",
        error: "Internal Server Error",
        code: "INTERNAL",
      }),
    }),
  );
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();

  await createAccountPage.createAccount(
    "QA E2E",
    "qa-e2e-500@example.test",
    "Qa-password-1!",
  );

  await expect(page.getByText(TEXT.internal)).toBeVisible();
  await expect(createAccountPage.createAccountButton).toBeEnabled();
});
