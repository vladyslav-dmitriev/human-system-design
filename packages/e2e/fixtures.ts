import { test as base, expect, type Browser } from "@playwright/test";

import { BASE_URL } from "./env";
import { CreateAccountPage } from "./pages/create-account-page";

export type TestUser = { name: string; email: string; password: string };

type StorageState = Awaited<
  ReturnType<import("@playwright/test").BrowserContext["storageState"]>
>;

function newUser(): TestUser {
  return {
    name: "QA E2E",
    email: `qa-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`,
    password: `Qa-${crypto.randomUUID()}-1!`,
  };
}

/**
 * Registers a user through the UI. The API throttles registration (10/min per IP)
 * and answers 429 when exceeded, so retry until the window frees up.
 */
async function registerThroughUi(
  browser: Browser,
): Promise<{ user: TestUser; storageState: StorageState }> {
  const user = newUser();
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  await expect(async () => {
    const createAccountPage = new CreateAccountPage(page);
    await createAccountPage.goto();
    const registerResponse = page.waitForResponse("**/service-auth/register");
    await createAccountPage.createAccount(user.name, user.email, user.password);
    const status = (await registerResponse).status();
    expect(status, "registration status (429 = throttled, retried)").toBe(201);
  }).toPass({ intervals: [65_000], timeout: 240_000 });

  await page.waitForURL("**/dashboard");
  const storageState = await context.storageState();
  await context.close();

  return { user, storageState };
}

type WorkerFixtures = {
  workerAccount: { user: TestUser; storageState: StorageState };
};

/**
 * `test`: every test starts signed in as ONE user shared by the worker (read-only scenarios).
 * Use `testIsolated` for scenarios that change the account (email, password).
 */
export const test = base.extend<{ freshUser: TestUser }, WorkerFixtures>({
  workerAccount: [
    async ({ browser }, use) => {
      await use(await registerThroughUi(browser));
    },
    { scope: "worker" },
  ],
  storageState: async ({ workerAccount }, use) => {
    await use(workerAccount.storageState);
  },
  freshUser: async ({ workerAccount }, use) => {
    await use(workerAccount.user);
  },
});

/** Each test gets its own brand new user, `page` is signed in as that user. */
export const testIsolated = base.extend<{
  freshUser: TestUser;
  account: { user: TestUser; storageState: StorageState };
}>({
  account: async ({ browser }, use) => {
    await use(await registerThroughUi(browser));
  },
  storageState: async ({ account }, use) => {
    await use(account.storageState);
  },
  freshUser: async ({ account }, use) => {
    await use(account.user);
  },
});

export { expect };
