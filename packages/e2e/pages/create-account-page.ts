import { Page, Locator } from "@playwright/test";

import { waitForPageReady } from "./helpers";

/** English texts of the registration form (packages/i18n messages). */
export const CREATE_ACCOUNT_TEXT = {
  nameRequired: "Enter your name",
  emailEmpty: "This field cannot be empty",
  emailInvalid: "Invalid email format",
  passwordRequired: "Enter new password",
  passwordTooShort: "Minimum 8 characters",
  passwordTooLong: "Password is too long (72 bytes max)",
  emailTaken: "An account with this email already exists",
  internal: "Something went wrong, please try again",
} as const;

export class CreateAccountPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly createAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId("name-input");
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.createAccountButton = page.getByTestId("create-account-button");
  }

  async goto(locale = "en") {
    await this.page.goto(`/${locale}/create-account`);
    await waitForPageReady(this.page);
  }

  async createAccount(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    await this.createAccountButton.click();
  }
}
