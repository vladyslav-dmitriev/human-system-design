import { Page } from "@playwright/test";

export class BillingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/en/billing");
  }
}
