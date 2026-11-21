import { Page, Locator } from "@playwright/test";

import { gotoAndWait } from "./helpers";

/** English texts of the settings forms (packages/i18n messages). */
export const SETTINGS_TEXT = {
  emailInvalid: "Invalid email format",
  currentPasswordRequired: "Enter current password",
  currentPasswordWrong: "Current password is incorrect",
  newPasswordTooShort: "Minimum 8 characters",
  newPasswordTooLong: "Password is too long (72 bytes max)",
  passwordChanged: "Password changed",
  emailChanged: "Email changed",
  emailTaken: "This email is already in use",
} as const;

export class SettingsPage {
  readonly page: Page;
  readonly emailInput: Locator;
  /** Current password, required to change the email. */
  readonly emailPasswordInput: Locator;
  readonly emailButton: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly passwordSubmit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-change-input");
    this.emailPasswordInput = page.getByTestId("email-change-password-input");
    this.emailButton = page.getByTestId("email-change-button");
    // The password form has no data-testid: find the form by its "new password" field,
    // so that the "current password" field of the email form is not matched too.
    const passwordForm = page
      .locator("form")
      .filter({ has: page.getByPlaceholder(/new password|новий/i) });
    this.currentPasswordInput = passwordForm.getByPlaceholder(
      /current password|поточний/i,
    );
    this.newPasswordInput =
      passwordForm.getByPlaceholder(/new password|новий/i);
    this.passwordSubmit = passwordForm.getByRole("button");
  }

  async goto(locale = "en") {
    await gotoAndWait(this.page, `/${locale}/settings`, this.emailInput);
  }

  async changeEmail(email: string, currentPassword: string) {
    await this.emailInput.fill(email);
    await this.emailPasswordInput.fill(currentPassword);
    await this.emailButton.click();
  }

  async changePassword(current: string, next: string) {
    await this.currentPasswordInput.fill(current);
    await this.newPasswordInput.fill(next);
    await this.passwordSubmit.click();
  }
}
