import { test, expect } from "@playwright/test";

import { CreateAccountPage } from "../pages/create-account-page";

test("create account: valid data signs the new user in and opens dashboard", async ({
  page,
}) => {
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();

  await createAccountPage.createAccount(
    "QA E2E",
    `qa-e2e-${Date.now()}@example.test`,
    `Qa-${crypto.randomUUID()}-1!`,
  );

  await expect(page).toHaveURL(/\/dashboard/);
});

test("create account: empty form is blocked by native validation", async ({
  page,
}) => {
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();

  await createAccountPage.createAccountButton.click();

  await expect(page).toHaveURL(/\/create-account/);
  await expect(createAccountPage.nameInput).toHaveJSProperty(
    "validity.valueMissing",
    true,
  );
});
