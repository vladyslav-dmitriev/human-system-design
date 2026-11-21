import { defineConfig, devices } from "@playwright/test";

import { BASE_URL } from "./env";

/**
 * Required environment (or packages/e2e/.env, see .env.example):
 *   E2E_USER_EMAIL, E2E_USER_PASSWORD - dedicated test user for the `authenticated` projects.
 * Optional: E2E_BASE_URL (default http://myapp.local).
 *
 * Run: pnpm --filter e2e exec playwright test
 * Note: the app uses real Google reCAPTCHA v3 (no test mode), so the stack needs internet access.
 */
const authFile = "playwright/.auth/user.json";

// Specs that need no session (or create their own users).
const noAuthSpecs = [
  "**/create-account.spec.ts",
  "**/login.spec.ts",
  "**/logout.spec.ts",
  "**/forgot-password.spec.ts",
  "**/auth-redirect.spec.ts",
  "**/locale.spec.ts",
];

// Specs that sign in as a freshly registered user (fixtures.ts), one per worker or per test,
// because they touch account state.
const freshUserSpecs = [
  "**/change-email.spec.ts",
  "**/change-password.spec.ts",
  "**/two-factor.spec.ts",
  "**/todos.spec.ts",
];

// Read-only specs that share the user from E2E_USER_EMAIL.
const authenticatedSpecs = [
  "**/billing.spec.ts",
  "**/settings.spec.ts",
  "**/locale-authenticated.spec.ts",
  "**/pricing-checkout.spec.ts",
];

const smokeSpecs = ["**/smoke.spec.ts"];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  // The target can be `next dev` (cold compiles, real reCAPTCHA round trip), so be generous.
  timeout: 300_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },

  projects: [
    { name: "setup", testMatch: "auth.setup.ts" },
    {
      name: "no-auth",
      use: devices["Desktop Chrome"],
      testMatch: noAuthSpecs,
    },
    {
      name: "fresh-user",
      use: devices["Desktop Chrome"],
      testMatch: freshUserSpecs,
    },
    {
      name: "authenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
      testMatch: authenticatedSpecs,
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"], storageState: authFile },
      dependencies: ["setup"],
      testMatch: smokeSpecs,
    },
  ],
});
