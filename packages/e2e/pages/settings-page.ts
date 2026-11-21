import { Page, Locator } from "@playwright/test";

import { gotoAndWait } from "./helpers";

export class SettingsPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly emailButton: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly passwordSubmit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-change-input");
    this.emailButton = page.getByTestId("email-change-button");
    // The password form has no data-testid (see report), so use i18n placeholders.
    this.currentPasswordInput = page.getByPlaceholder(
      /current password|поточний/i,
    );
    this.newPasswordInput = page.getByPlaceholder(/new password|новий/i);
    this.passwordSubmit = this.newPasswordInput
      .locator("xpath=ancestor::form")
      .getByRole("button");
  }

  async goto(locale = "en") {
    await gotoAndWait(this.page, `/${locale}/settings`, this.emailInput);
  }

  async changeEmail(email: string) {
    await this.emailInput.fill(email);
    await this.emailButton.click();
  }

  async changePassword(current: string, next: string) {
    await this.currentPasswordInput.fill(current);
    await this.newPasswordInput.fill(next);
    await this.passwordSubmit.click();
  }
}
