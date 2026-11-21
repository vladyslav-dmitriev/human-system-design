import { test, expect } from "@playwright/test";

import { gotoAndWait } from "../pages/helpers";

const pricingHeading = (page: import("@playwright/test").Page) =>
  page.getByRole("heading", { name: "Everything you need to grow" });

// Never talk to real Stripe from e2e: stub stripe.js and the checkout page itself.
test.beforeEach(async ({ page }) => {
  await page.route("https://js.stripe.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" }),
  );
  await page.route("https://*.stripe.com/**", (route) => route.abort());
});

test("pricing: shows the three plans and one-time products", async ({
  page,
}) => {
  await gotoAndWait(page, "/en/pricing", pricingHeading(page));

  await expect(
    page.getByRole("heading", { name: "Everything you need to grow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Upgrade to Premium|Premium/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Priority Support" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Unlimited Storage" }),
  ).toBeVisible();
});

test("pricing: choosing a plan navigates to checkout with plan params", async ({
  page,
}) => {
  await gotoAndWait(page, "/en/pricing", pricingHeading(page));
  // Checkout is rendered on the server and creates a Stripe PaymentIntent in the API.
  // Intercept the navigation so that no Stripe call is ever made.
  await page.route(/\/en\/checkout\?/, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body>stub</body></html>",
    }),
  );

  // The page is server-rendered: a click before hydration is lost, so retry the click.
  let checkoutUrl = "";
  await expect(async () => {
    const request = page.waitForRequest(/\/en\/checkout\?/, { timeout: 5_000 });
    await page
      .getByRole("button", { name: /Premium/ })
      .first()
      .click();
    checkoutUrl = (await request).url();
  }).toPass({ timeout: 60_000 });

  const url = new URL(checkoutUrl);
  expect(url.pathname).toBe("/en/checkout");
  expect(url.searchParams.get("type")).toBe("subscription");
  expect(url.searchParams.get("billingOperation")).toMatch(/purchase|upgrade/);
  expect(url.searchParams.get("priceId")).toBeTruthy();
  expect(url.searchParams.get("email")).toBeTruthy();
});

test("pricing: Free plan has no purchase button", async ({ page }) => {
  await gotoAndWait(page, "/en/pricing", pricingHeading(page));
  await expect(page.getByText("Free", { exact: true })).toBeVisible();

  await expect(page.getByRole("button", { name: /Free/ })).toHaveCount(0);
});

test("checkout: opening it without params redirects to home", async ({
  page,
}) => {
  await page.goto("/en/checkout");

  await expect(page).not.toHaveURL(/checkout/);
});
