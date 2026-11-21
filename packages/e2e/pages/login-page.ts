import { Page, Locator, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
    this.forgotPasswordLink = page.getByRole("link", {
      name: /forgot password|забули/i,
    });
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/login`);
    await waitForPageReady(this.page);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Submits the form and returns the status of POST /service-auth/login.
   * The API throttles login to 3 per minute per IP (429), so retry once the window is over.
   * Retry no faster than the 60s window: hits on a blocked key keep it blocked.
   */
  async loginAndGetStatus(email: string, password: string): Promise<number> {
    let status = 0;
    await expect(async () => {
      await this.goto();
      const response = this.page.waitForResponse("**/service-auth/login");
      await this.login(email, password);
      status = (await response).status();
      expect(status, "429 = throttled, retried").not.toBe(429);
    }).toPass({ intervals: [65_000], timeout: 240_000 });
    return status;
  }
}
