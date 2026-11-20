import { Page, Locator } from "@playwright/test";

import { gotoAndWait } from "./helpers";

// NOTE: todo texts are hardcoded in Russian in the product (see report, i18n finding),
// and the todo cards have no data-testid. Replace with testids once frontend adds them.
export class TodosPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByPlaceholder("Например: Купить продукты...");
    this.fileInput = page.locator('input[type="file"]');
    this.submitButton = page.getByRole("button", { name: "Создать задачу" });
    this.emptyState = page.getByText("Задач пока нет. Создайте первую!");
  }

  async goto(locale = "en") {
    await gotoAndWait(this.page, `/${locale}/todos`, this.titleInput);
  }

  async create(title: string) {
    await this.titleInput.fill(title);
    await this.submitButton.click();
  }

  card(title: string): Locator {
    // No testid on the card yet: the outer Card is the first overflow-hidden block with the title.
    return this.page
      .locator("div.overflow-hidden")
      .filter({ hasText: title })
      .first();
  }

  toggleButton(title: string): Locator {
    return this.card(title).locator("svg.lucide-square-check");
  }

  deleteButton(title: string): Locator {
    return this.card(title).locator("svg.lucide-trash");
  }
}
