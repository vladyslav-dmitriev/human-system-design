import { test, expect } from "@playwright/test";

import { LoginPage } from "../pages/login-page";

// Password reset is not implemented yet (decision in docs/fix-plan.md): the page is hidden
// and redirects to the login page of the same locale; no link to it on the login page.
for (const locale of ["en", "uk"]) {
  test(`forgot password: /${locale}/forgot-password redirects to /${locale}/login`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/forgot-password`);

    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
  });
}

test("forgot password: the login page has no link to it", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await expect(loginPage.forgotPasswordLink).toHaveCount(0);
  await expect(page.locator('a[href*="forgot-password"]')).toHaveCount(0);
});
