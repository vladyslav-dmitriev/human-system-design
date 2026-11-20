import { Page, Locator } from "@playwright/test";

export class HeaderPage {
  readonly page: Page;
  readonly languageSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.languageSelect = page.getByRole("banner").getByRole("combobox");
  }

  async selectLanguage(label: "EN" | "UA") {
    await this.languageSelect.click();
    await this.page.getByRole("option", { name: label }).click();
  }
}
