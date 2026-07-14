import { test } from "@playwright/test";

import { LoginPage } from "../pages/login-page";

const authFile = "playwright/.auth/user.json";

test("authenticate", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // await Promise.all([
  //   page.waitForURL("**/dashboard", { timeout: 15000 }),
  //   loginPage.login("vladyslav.dmitriev@gmail.com", "78789898"),
  // ]);

  await loginPage.login("vladyslav.dmitriev@gmail.com", "78789898");
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
