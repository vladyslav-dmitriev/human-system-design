---
name: nestjs-expert
description: NestJS 11 в apps/api (в т.ч. структура нового модуля по образцу src/modules/todo): модули, controller → service → repository, DI и области видимости, DTO и class-validator, guards и JWT/Passport, exception filters, Swagger, unit/e2e-тесты. Используй при создании и ревью модулей, эндпоинтов и auth. Доступ к БД через Prisma (скилл prisma-7).
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

## Правила модуля (образец `todo`, без его недостатков: `@ts-ignore`, валидация файлов в контроллере, русские строки в ошибках)

- Файлы: `<name>.module.ts`, `<name>s.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`, `dto/{request/{body,query,params},response,common}/*.dto.ts` + `dto/index.ts`, `index.ts` (`export { <Name>Module }`). Модуль подключай в `AppModule`.
- Контроллер: `@ApiTags`, `@ApiCookieAuth`, `@UseGuards(AuthGuard, RolesGuard)`, `@Serialize(ResponseDto)` на каждом эндпоинте. Публичный эндпоинт без guard только осознанно, отметь в отчёте.
- `userId` только через `@GetUser('id')`, никогда из body или query. Чужие данные: проверка владельца в сервисе или фильтр по `userId` в `where` репозитория (защита от IDOR).
- Prisma только из repository, поля через `select`. DTO: каждое поле с `class-validator` и `@ApiProperty`.
- Загрузка файлов: тип и размер проверяются, затем `StorageService.upload`; лимиты в константах.
- Новые env только через `src/config`. Тесты: `*.service.spec.ts` рядом с сервисом (jest), репозиторий мокай; подробности в скилле `unit-testing`.

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

Шаблоны: `assets/templates/` (controller, module, service).

## Важно

- Примеры в справочниках могут использовать TypeORM или Drizzle: в проекте только Prisma, через repository (скилл `prisma-7`).
- Ключи и URL только через `@nestjs/config` (`src/config`), не `process.env` в коде сервисов.
- Не отдавай в ответах пароли, токены и внутренние стектрейсы.
- Не используй `any` без причины.
- Безопасность (IDOR, mass assignment, rate limit): скилл `web-security`.
