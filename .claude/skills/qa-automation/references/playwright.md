# Playwright: шаблоны и приёмы

## Структура теста
```ts
import { test, expect } from "@playwright/test";
import { SettingsPage } from "../pages/settings-page";

test.describe("Settings: смена имени", () => {
  test("сохраняет новое имя и показывает его в профиле", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    const name = `QA ${crypto.randomUUID().slice(0, 8)}`;

    await settings.changeName(name);

    await expect(page.getByText(name)).toBeVisible();
  });
});
```

## Page Object
```ts
import { type Page, type Locator } from "@playwright/test";

export class ExamplePage {
  readonly submit: Locator;
  constructor(private readonly page: Page) {
    this.submit = page.getByRole("button", { name: /save|сохранить/i });
  }
  async goto() { await this.page.goto("/settings"); }
}
```
Локали: тексты берутся из i18n, поэтому для проверок лучше `data-testid` или роль + имя, не зависящее от языка. Если нужен текст, бери его из `@repo/i18n`, а не копируй строкой.

## Ожидание сети и ответов
```ts
const response = page.waitForResponse(r => r.url().includes("/api/user") && r.request().method() === "PATCH");
await settings.submit.click();
expect((await response).status()).toBe(200);
```
Ставь `waitForResponse` до действия, которое его вызывает.

## Моки
```ts
await page.route("**/api/external/**", route =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
```
Отдельным тестом проверяй поведение при 500 и таймауте: `route.fulfill({ status: 500 })`, `route.abort()`.

## Авторизация
Логин один раз в `auth.setup.ts`, состояние в `storageState`. Тесты, меняющие аккаунт (email, пароль, удаление), используют отдельного свежесозданного пользователя, иначе ломают соседей.

## Параллельность
`fullyParallel: true`. Тесты, делящие одно состояние, помечай `test.describe.configure({ mode: "serial" })` только в крайнем случае, лучше разнести данные.

## Визуальные и a11y проверки
- Скриншоты: `await expect(page).toHaveScreenshot()` только для стабильных экранов, маскируй динамику (`mask: [...]`).
- a11y: `@axe-core/playwright`, `new AxeBuilder({ page }).analyze()` на ключевых страницах, нарушения уровня serious и выше фейлят тест.

## API-тесты в Playwright
```ts
test("GET /health", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
});
```
Для ресурсов с авторизацией проверяй 401 без токена, 403 на чужой ресурс, 400 на невалидное тело, 404, идемпотентность повторного запроса.

## Отладка
- `--ui` (интерактивно), `--debug` (инспектор), `--trace on` и `show-trace`.
- `trace: "on-first-retry"` уже включён в конфиге. Для расследования локально запускай с `--trace on`.
- В CI артефакты: `playwright-report`, `test-results`.

## Flaky: частые причины
| Симптом | Причина | Решение |
|---|---|---|
| Иногда не находит элемент | клик до гидратации Next | ждать видимое и включённое состояние, ассерт перед действием |
| Падает только в параллели | общий аккаунт или данные | уникальные данные на тест |
| Падает после анимации | элемент двигается | `expect(...).toBeVisible()`, отключить анимации в тестовом режиме |
| Текст не совпал | локаль или форматирование | роль/testid или текст из i18n |
| Ответ API не пойман | `waitForResponse` поставлен после клика | ставить до действия |

## Unit и API (vitest / jest)
- Именование: `describe(<модуль>)` → `it("делает X, когда Y")`. Arrange-Act-Assert.
- Мокай границы (БД, HTTP, время), не внутреннюю логику. Время: `vi.useFakeTimers()` / `jest.useFakeTimers()`.
- NestJS: `Test.createTestingModule`, переопределяй провайдеры через `overrideProvider`, e2e контроллеров через supertest. Проверяй guards, pipes валидации, фильтры ошибок.
- Покрытие смотрит на ветки и ошибки, а не на процент ради процента.

## CI
Ожидаемая цель: быстрый smoke на каждый PR, полный набор по расписанию. Шардинг: `--shard=1/4`. Репортеры в CI: `list` + `html` + `junit`. Изменения workflow делает `devops`, QA описывает требования в отчёте.
