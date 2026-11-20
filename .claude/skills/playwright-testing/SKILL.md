---
name: playwright-testing
description: Практики тестирования для монорепо: Playwright (packages/e2e), vitest + Testing Library (apps/web), jest (apps/api). Стабильные селекторы, page objects, авторизация, ожидания, тестовые данные, борьба с флейками. Используй при написании и ревью тестов.
---

# Тестирование: Playwright, vitest, jest

Приоритет у правил репозитория (`CLAUDE.md`). Тесты Playwright живут в `packages/e2e` (проекты `setup` / `no-auth` / `authenticated`, авторизация в `auth.setup.ts`, page objects в `packages/e2e/pages`).

## Playwright (e2e)

**Селекторы:** `getByRole` (с `name`), `getByLabel`, `getByText`, затем `data-testid`. Не CSS-цепочки и не XPath. Если нужного атрибута нет, опиши это в отчёте для `frontend`.

**Ожидания:**
- Только auto-waiting и web-first assertions: `await expect(locator).toBeVisible()`, `toHaveText`, `toHaveURL`.
- Никаких `waitForTimeout` и `sleep`. Ждать можно ответ (`page.waitForResponse`) или состояние элемента.
- Не используй `expect(await locator.isVisible())`: нет повторов.

**Структура:**
- Page object на страницу: локаторы и действия, без `expect` внутри (проверки в тесте).
- Один тест = один пользовательский сценарий; независимые тесты, без порядка выполнения.
- Авторизация через `storageState` из setup-проекта, а не логин в каждом тесте.
- Новый spec добавь в `testMatch` нужного проекта в `playwright.config.ts`.

**Данные:**
- Уникальные данные на прогон (суффикс с временем или uuid), чтобы тесты не конфликтовали и были повторяемы.
- Только тестовые аккаунты; для Stripe только тестовые карты. Секреты и реальные данные в тестах не хранить.
- Внешние сервисы (почта, платежи) мокай через `page.route` или тестовый режим провайдера.

**Флейки:**
- Падение один раз из пяти считается багом теста или продукта, не «перезапусти». Найди причину: гонка, общий state, неверное ожидание.
- Отладка: `npx playwright test --trace on`, `--ui`, `playwright show-trace`.
- Ретраи в CI допустимы, но не вместо исправления.

## vitest + Testing Library (apps/web)

- Запрос по роли и тексту (`screen.getByRole`), `userEvent` вместо `fireEvent`.
- Тестируй поведение для пользователя, не внутреннее состояние и не детали реализации.
- Компоненты с next-intl оборачивай в провайдер сообщений; серверные компоненты тестируй через e2e.
- Пример в репозитории: `widgets/auth/auth-form-button/auth-form-button.test.tsx`.

## jest (apps/api)

- `*.spec.ts` рядом с файлом. Сервисы: мок repository через `Test.createTestingModule` и `useValue`.
- Контроллеры и guards: `supertest` в `test/` (`pnpm --filter api test:e2e`), тестовая БД, не dev.
- Проверяй не только успех: 401 / 403 для чужих данных, 400 для невалидного DTO, 404, конфликт.

## Что тестировать в первую очередь

Happy path, ошибки валидации, граничные значения, права доступа (чужие данные), повторная и параллельная отправка, поведение при падении сети или API.
