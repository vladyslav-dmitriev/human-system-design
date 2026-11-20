import { test, expect } from "@playwright/test";

import { waitForPageReady } from "../pages/helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/en/forgot-password");
  await waitForPageReady(page);
});

test("forgot password: page shows the reset form", async ({ page }) => {
  await expect(page.getByText("Reset password")).toBeVisible();
  await expect(page.getByPlaceholder("name@domain.com")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to login" }),
  ).toHaveAttribute("href", /\/login$/);
});

test("forgot password: empty email shows 'Email is required'", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Send instructions" }).click();

  await expect(page.getByText("Email is required")).toBeVisible();
});

test("forgot password: malformed email shows 'Invalid email'", async ({
  page,
}) => {
  await page.getByPlaceholder("name@domain.com").fill("not-an-email");
  await page.getByRole("button", { name: "Send instructions" }).click();

  await expect(page.getByText("Invalid email")).toBeVisible();
});

test("forgot password: valid email shows the confirmation state", async ({
  page,
}) => {
  await page
    .getByPlaceholder("name@domain.com")
    .fill("qa-e2e-nobody@example.test");
  await page.getByRole("button", { name: "Send instructions" }).click();

  await expect(page.getByText("Check your email")).toBeVisible();
});

// BUG: см. FIX.md "Forgot password не обращается к API" [L3]
// The form only fakes a 1.5s delay, shows success and never calls the API.
test.fixme("forgot password: a request to the API is sent", async ({
  page,
}) => {
  const request = page.waitForRequest(/forgot|reset/i, { timeout: 5_000 });
  await page
    .getByPlaceholder("name@domain.com")
    .fill("qa-e2e-nobody@example.test");
  await page.getByRole("button", { name: "Send instructions" }).click();
  await request;
});
