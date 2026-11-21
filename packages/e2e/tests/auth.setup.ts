import { test } from "@playwright/test";

import { getE2eCredentials } from "../env";
import { LoginPage } from "../pages/login-page";

const authFile = "playwright/.auth/user.json";

test("authenticate", async ({ page }) => {
  const { email, password } = getE2eCredentials();

  const loginPage = new LoginPage(page);
  await loginPage.loginAndGetStatus(email, password);

  await page.waitForURL("**/dashboard");

  await page.context().storageState({ path: authFile });
});
