import { Page, Locator, expect } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly emailButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-change-input");
    this.emailButton = page.getByTestId("email-change-button");
  }

  async goto() {
    await this.page.goto("/en/settings");
  }

  async changeEmail(email: string) {
    await this.emailInput.click();
    await this.emailInput.fill("");
    await this.emailInput.pressSequentially(email, { delay: 50 });
    await expect(this.emailInput).toHaveValue(email);
    await this.page.waitForTimeout(500);

    await expect(this.emailButton).toBeEnabled({ timeout: 5000 });

    await this.emailButton.click();
  }

  async expectEmailToBe(email: string) {
    await expect(this.emailInput).toHaveValue(email);
  }
}
