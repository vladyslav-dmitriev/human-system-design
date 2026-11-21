import { test, expect } from "@playwright/test";

import { gotoAndWait } from "../pages/helpers";

// Runs in the Mobile Chrome (Pixel 5) project, signed in as the E2E user.
test("mobile: dashboard renders for a signed-in user", async ({ page }) => {
  await gotoAndWait(
    page,
    "/en/dashboard",
    page.getByRole("heading", { name: "Dashboard" }),
  );

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("mobile: settings page renders its forms", async ({ page }) => {
  await gotoAndWait(
    page,
    "/en/settings",
    page.getByRole("heading", { name: "Settings" }),
  );

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByTestId("email-change-input")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("mobile: pricing shows plans without horizontal overflow", async ({
  page,
}) => {
  await gotoAndWait(
    page,
    "/en/pricing",
    page.getByRole("heading", { name: "Everything you need to grow" }),
  );

  await expect(
    page.getByRole("heading", { name: "Everything you need to grow" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
