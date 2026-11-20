---
name: nestjs-module
description: Модуль NestJS в apps/api по образцу modules/todo (controller → service → repository, DTO, Swagger, guards). Используй при добавлении эндпоинтов и модулей.
---

# Модуль NestJS в apps/api

Образец: `apps/api/src/modules/todo`. Бери структуру оттуда, а не копируй его недостатки (`@ts-ignore`, валидацию файлов в контроллере, русские строки в ошибках).

## Структура

```
src/modules/<name>/
  <name>.module.ts
  <name>s.controller.ts      # тонкий: guards, декораторы, вызов сервиса
  <name>.service.ts          # бизнес-логика, проверки владельца, исключения Nest
  <name>.repository.ts       # единственное место, где используется PrismaService
  dto/
    request/body|query|params/*.dto.ts   # class-validator + @ApiProperty
    response/*.dto.ts
    common/*.dto.ts
    index.ts
  index.ts                   # export { <Name>Module }
```

Подключи модуль в `AppModule`.

## Правила

1. Контроллер: `@ApiTags`, `@ApiCookieAuth`, `@UseGuards(AuthGuard, RolesGuard)`, `@Serialize(ResponseDto)` на каждом эндпоинте. Публичный эндпоинт без guard делай только осознанно и отметь это в отчёте.
2. `userId` берём через `@GetUser('id')`, никогда из body или query.
3. Доступ к чужим данным: в сервисе проверяй владельца ресурса (`NotFoundException` / `ForbiddenException`) или фильтруй по `userId` прямо в `where` репозитория. Это защита от IDOR.
4. Prisma вызывается только из repository. Выбирай нужные поля через `select`, не отдавай наружу лишнее.
5. DTO: каждое поле с `class-validator` и `@ApiProperty`, id как `@IsString()` / `@IsUUID()` по схеме.
6. Загрузка файлов: проверка типа и размера, затем `StorageService.upload`. Лимиты и допустимые типы вынеси в константы.
7. Новые env-переменные добавляй в `src/config`, а не читай `process.env` по месту.
8. Тесты: `*.service.spec.ts` рядом с сервисом (jest), репозиторий мокай.

## Проверка

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```
