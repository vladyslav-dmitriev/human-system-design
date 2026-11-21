import { Page, Locator, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers";

/** English texts of the login form (packages/i18n messages), used as accessible text. */
export const LOGIN_TEXT = {
  emailEmpty: "This field cannot be empty",
  emailInvalid: "Invalid email format",
  passwordRequired: "Enter your password",
  invalidCredentials: "Invalid email or password",
  invalidOtp: "Invalid or expired code",
  rateLimited: "Too many attempts, please try again later",
  otpHint: "Enter the 6-digit code sent to your phone:",
} as const;

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  /** Hidden until password reset is implemented: tests assert it is absent. */
  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator;
  /** Step 2 of the sign-in with two-factor authentication. */
  readonly otpInput: Locator;
  readonly verifyButton: Locator;
  readonly backToLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
    this.forgotPasswordLink = page.getByRole("link", {
      name: /forgot password|забули/i,
    });
    this.createAccountLink = page.getByRole("link", {
      name: "Create account",
    });
    this.otpInput = page.getByRole("textbox", {
      name: "6-digit verification code",
    });
    this.verifyButton = page.getByRole("button", { name: "Verify" });
    this.backToLoginButton = page.getByRole("button", {
      name: "Back to login",
    });
  }

  async goto(locale = "en", callbackUrl?: string) {
    const query = callbackUrl
      ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "";
    await this.page.goto(`/${locale}/login${query}`);
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
   *
   * `keepUrl`: do not navigate to a clean /login, reload the current URL instead
   * (needed to keep ?callbackUrl= while retrying).
   */
  async loginAndGetStatus(
    email: string,
    password: string,
    { keepUrl = false }: { keepUrl?: boolean } = {},
  ): Promise<number> {
    let status = 0;
    await expect(async () => {
      if (keepUrl) {
        await this.page.goto(this.page.url());
        await waitForPageReady(this.page);
      } else {
        await this.goto();
      }
      const response = this.page.waitForResponse("**/service-auth/login");
      await this.login(email, password);
      status = (await response).status();
      expect(status, "429 = throttled, retried").not.toBe(429);
    }).toPass({ intervals: [65_000], timeout: 240_000 });
    return status;
  }
}
