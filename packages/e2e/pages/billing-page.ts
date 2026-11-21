import { Page, Locator } from "@playwright/test";

import { gotoAndWait } from "./helpers";

export class BillingPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Billing" });
  }

  async goto(locale = "en") {
    await gotoAndWait(this.page, `/${locale}/billing`, this.heading);
  }
}
