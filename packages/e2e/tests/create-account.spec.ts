import test from "@playwright/test";

import { CreateAccountPage } from "../pages/create-account-page";

test("create account by mock test", async ({ page }) => {
  const createAccountPage = new CreateAccountPage(page);
  await createAccountPage.goto();

  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 15000 }),
    createAccountPage.createAccount(
      "e2e",
      `test-${Date.now()}@example.com`,
      "12345678",
    ),
  ]);
});
