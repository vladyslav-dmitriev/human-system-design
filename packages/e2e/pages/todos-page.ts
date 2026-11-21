import { Page, Locator } from "@playwright/test";

import { gotoAndWait } from "./helpers";

// English texts (packages/i18n todo.json). Cards have no data-testid, but the action
// buttons have accessible names that include the title.
export class TodosPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly emptyState: Locator;
  readonly imagePreview: Locator;
  readonly createFailedToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByLabel("Task title");
    this.fileInput = page.getByLabel("Attach a photo to the task (optional)");
    this.submitButton = page.getByRole("button", { name: "Create task" });
    this.emptyState = page.getByText("No tasks yet. Create the first one!");
    this.imagePreview = page.getByAltText("Image preview");
    this.createFailedToast = page.getByText("Could not create the task");
  }

  async goto(locale = "en") {
    await gotoAndWait(this.page, `/${locale}/todos`, this.titleInput);
  }

  async create(title: string) {
    await this.titleInput.fill(title);
    await this.submitButton.click();
  }

  title(title: string): Locator {
    return this.page.getByText(title, { exact: true });
  }

  toggleButton(title: string): Locator {
    return this.page.getByRole("button", { name: `Mark "${title}" as done` });
  }

  /** Visible only for ADMIN. */
  deleteButton(title: string): Locator {
    return this.page.getByRole("button", { name: `Delete "${title}"` });
  }
}
