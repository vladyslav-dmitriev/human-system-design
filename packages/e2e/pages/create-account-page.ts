import { Page, Locator } from "@playwright/test";

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

  async goto() {
    await this.page.goto("/en/create-account");
  }

  async createAccount(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    await this.createAccountButton.click();
  }
}
