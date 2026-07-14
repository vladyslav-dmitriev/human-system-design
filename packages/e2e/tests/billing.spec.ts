import { test, expect } from "@playwright/test";

import { BillingPage } from "../pages/billing-page";

test("billing page need to be accessible", async ({ page }) => {
  const billingPage = new BillingPage(page);
  await billingPage.goto();

  await expect(page).toHaveURL(/.*billing/);
  await expect(page.getByText("Billing")).toBeVisible();
});
