import { test, expect } from "../fixtures";
import { TodosPage } from "../pages/todos-page";

// Workaround for the env bug in FIX.md ("Todos: список грузится с docker-хоста"):
// the browser asks http://api:3001 which only exists inside docker. Redirect those
// GETs to the public /api so that the remaining flows (create/toggle/delete) can be tested.
async function shimTodosList(page: import("@playwright/test").Page) {
  await page.route("http://api:3001/todos**", async (route) => {
    const url = new URL(route.request().url());
    const response = await page.request.get(`/api/todos${url.search}`);
    await route.fulfill({ response });
  });
}

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("todos: empty state for a new user", async ({ page, freshUser }) => {
  void freshUser;
  await shimTodosList(page);
  const todos = new TodosPage(page);

  await todos.goto();

  await expect(todos.emptyState).toBeVisible();
  await expect(todos.submitButton).toBeDisabled();
});

test("todos: whitespace-only title cannot be submitted", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();

  await todos.titleInput.fill("   ");

  await expect(todos.submitButton).toBeDisabled();
});

test("todos: create sends the title to the API and returns 201", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `todo-${Date.now()}`;

  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/todos") && r.request().method() === "POST",
  );
  await todos.create(title);

  const created = await response;
  expect(created.status()).toBe(201);
  expect(await created.json()).toMatchObject({ title, completed: false });
  await expect(todos.titleInput).toHaveValue("");
});

// BUG: см. FIX.md "Todos: список не загружается и не обновляется" [L3]
// The list GET goes to http://api:3001 from the browser and the form has no refresh callback.
test.fixme("todos: created todo is shown in the list", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `todo-${Date.now()}`;

  await todos.create(title);

  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("todos: created todo survives reload and can be completed", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  await shimTodosList(page);
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `todo-${Date.now()}`;
  await todos.create(title);

  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const toggle = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes("/api/todos/"),
  );
  await todos.toggleButton(title).click();
  expect((await toggle).ok()).toBe(true);
  await expect(page.getByText(title, { exact: true })).toHaveClass(
    /line-through/,
  );
});

// BUG: см. FIX.md "Todos: удаление доступно в UI, но API разрешает только ADMIN" [L3]
// DELETE /api/todos/:id answers 403 for the owner (@Roles('ADMIN')), UI shows the trash icon to everyone
// and gives no feedback.
test.fixme("todos: owner can delete own todo", async ({ page, freshUser }) => {
  void freshUser;
  await shimTodosList(page);
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `todo-${Date.now()}`;
  await todos.create(title);
  await page.reload();

  const remove = page.waitForResponse(
    (r) => r.request().method() === "DELETE" && r.url().includes("/api/todos/"),
  );
  await todos.deleteButton(title).click();
  expect((await remove).ok()).toBe(true);
  await expect(todos.emptyState).toBeVisible();
});

test("todos: image upload sends multipart with the file (S3 mocked)", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "mock-id",
        title: "with image",
        completed: false,
        imageUrl: "https://mock-s3.example.test/image.png",
      }),
    });
  });
  const todos = new TodosPage(page);
  await todos.goto();

  await todos.fileInput.setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByAltText("Preview")).toBeVisible();

  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/todos") && r.method() === "POST",
  );
  await todos.create("with image");

  const posted = await request;
  expect(posted.headers()["content-type"]).toContain("multipart/form-data");
  expect(posted.postData()).toContain('filename="pixel.png"');
  await expect(page.getByAltText("Preview")).toHaveCount(0);
});
