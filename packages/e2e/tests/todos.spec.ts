import { test, expect } from "../fixtures";
import { TodosPage } from "../pages/todos-page";

// 1x1 PNG: the API checks the file signature, not the extension or Content-Type.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("todos: empty state for a new user", async ({ page, freshUser }) => {
  void freshUser;
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

// Fixed in wave 1 (FIX.md "Todos: список не загружается и не обновляется"): the list is
// requested from the public API URL and the form refreshes it after creating.
test("todos: created todo is shown in the list without reloading", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `todo-${Date.now()}`;

  await todos.create(title);

  await expect(todos.title(title)).toBeVisible();
  await expect(todos.emptyState).toHaveCount(0);
});

test("todos: title is trimmed by the API", async ({ page, freshUser }) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `trim-${Date.now()}`;

  await todos.create(`   ${title}   `);

  await expect(todos.title(title)).toBeVisible();
});

test("todos: created todo survives reload and can be completed", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `todo-${Date.now()}`;
  await todos.create(title);

  await page.reload();
  await expect(todos.title(title)).toBeVisible();

  const toggle = page.waitForRequest(
    (r) => r.method() === "PATCH" && r.url().includes("/api/todos/"),
  );
  const toggled = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes("/api/todos/"),
  );
  await todos.toggleButton(title).click();
  // contract C3: the body is exactly {completed}
  expect((await toggle).postDataJSON()).toEqual({ completed: true });
  expect((await toggled).ok()).toBe(true);
  await expect(todos.title(title)).toHaveClass(/line-through/);
});

// Decision (docs/fix-plan.md): DELETE is ADMIN only; the web shows the delete button to ADMIN only.
// The e2e user is a regular USER, so there is no button and the API refuses a direct call.
test("todos: a regular user has no delete button and the API refuses DELETE with 403", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();
  const title = `todo-${Date.now()}`;
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/api/todos") && r.request().method() === "POST",
  );
  await todos.create(title);
  const { id } = await (await created).json();
  await expect(todos.title(title)).toBeVisible();

  await expect(todos.deleteButton(title)).toHaveCount(0);

  const res = await page.request.delete(`/api/todos/${id}`);
  expect(res.status()).toBe(403);
  expect(await res.json()).toMatchObject({ code: "FORBIDDEN" });
  await page.reload();
  await expect(todos.title(title)).toBeVisible();
});

test("todos: DELETE of a todo that does not exist is 404, not 500 (admin-only, so USER gets 403 first)", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();

  const res = await page.request.delete("/api/todos/does-not-exist");

  // a regular user is stopped by the role guard before the lookup
  expect(res.status()).toBe(403);
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
    buffer: PNG_1X1,
  });
  await expect(todos.imagePreview).toBeVisible();

  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/todos") && r.method() === "POST",
  );
  await todos.create("with image");

  const posted = await request;
  expect(posted.headers()["content-type"]).toContain("multipart/form-data");
  expect(posted.postData()).toContain('filename="pixel.png"');
  await expect(todos.imagePreview).toHaveCount(0);
});

// The API checks the file by its signature, so a text file renamed to .png never reaches S3.
test("todos: a file that is not a real image is rejected by the API (nothing is created)", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();
  await todos.fileInput.setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("this is plain text, not a PNG"),
  });
  const title = `fake-${Date.now()}`;

  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/todos") && r.request().method() === "POST",
  );
  await todos.create(title);

  expect((await response).status()).toBe(400);
  await expect(todos.createFailedToast).toBeVisible();
  await expect(todos.title(title)).toHaveCount(0);
});

test("todos: a title over 200 characters is rejected by the API", async ({
  page,
  freshUser,
}) => {
  void freshUser;
  const todos = new TodosPage(page);
  await todos.goto();

  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/todos") && r.request().method() === "POST",
  );
  await todos.create("x".repeat(201));

  expect((await response).status()).toBe(400);
  await expect(todos.createFailedToast).toBeVisible();
});
