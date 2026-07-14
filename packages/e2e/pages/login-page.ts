import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
  }

  async goto() {
    await this.page.goto("/en/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.click();
    await this.emailInput.pressSequentially(email, { delay: 50 });
    await expect(this.emailInput).toHaveValue(email);
    await this.page.waitForTimeout(500);

    await this.emailInput.click();
    await this.passwordInput.click();
    await this.passwordInput.pressSequentially(password, { delay: 50 });
    await expect(this.passwordInput).toHaveValue(password);
    await this.page.waitForTimeout(500);

    await this.loginButton.click();
  }
}
