---
name: nestjs-expert
description: NestJS 11 в apps/api: модули, controller → service → repository, DI и области видимости, DTO и class-validator, guards и JWT/Passport, exception filters, Swagger, unit/e2e-тесты. Используй при создании и ревью модулей, эндпоинтов и auth. Доступ к БД через Prisma (скилл prisma-7).
---

# NestJS 11 (apps/api)

Приоритет у правил репозитория (`CLAUDE.md`). Образцы: `apps/api/src/modules/todo`, `auth`, `billing`. Слои: `*.module.ts`, `*.controller.ts` (тонкий), `*.service.ts` (логика), `*.repository.ts` (только здесь Prisma), `dto/`, `index.ts`.

## Порядок работы

1. Определи модули, эндпоинты и связи, найди похожий модуль и повторяй его.
2. Модуль: экспортируй только то, что нужно другим модулям; без `forwardRef` (перестрой зависимости).
3. DTO с `class-validator`, отдельные Create / Update / Response; глобальный `ValidationPipe` с `whitelist` и `transform`.
4. Контроллер: guard, Swagger-декораторы (`@ApiTags`, `@ApiOperation`, `@Api*Response`), без логики.
5. Сервис: бросает типизированные исключения (`NotFoundException`, `ConflictException`); проверяет владельца ресурса.
6. Тесты: unit для сервисов (`Test.createTestingModule`), e2e для контроллеров.
7. `pnpm --filter api typecheck`, `lint`, `test`.

## Справочники

| Тема | Файл | Когда |
|---|---|---|
| Контроллеры, Swagger | `references/controllers-routing.md` | новые эндпоинты |
| Сервисы, DI | `references/services-di.md` | провайдеры |
| Области видимости DI | `references/di-provider-scoping.md` | REQUEST / TRANSIENT |
| Границы модулей | `references/module-boundaries.md` | рефакторинг, циклы |
| Архитектура | `references/architecture.md` | новый домен |
| DTO и валидация | `references/dtos-validation.md` | входные данные |
| Исключения и фильтры | `references/error-exception-filters.md` | формат ошибок |
| Auth | `references/authentication.md` | JWT, Passport, guards |
| Тесты | `references/testing-patterns.md` | jest, supertest |

Шаблоны: `assets/templates/` (controller, module, service).

## Важно

- Примеры в справочниках могут использовать TypeORM или Drizzle: в проекте только Prisma, через repository (скилл `prisma-7`).
- Ключи и URL только через `@nestjs/config` (`src/config`), не `process.env` в коде сервисов.
- Не отдавай в ответах пароли, токены и внутренние стектрейсы.
- Не используй `any` без причины.
- Безопасность (IDOR, mass assignment, rate limit): скилл `web-security`.
