---
name: api-contract
description: Формат описания контракта web ↔ api (эндпоинты Nest/Swagger и apps/web/api.ts). Используй, когда эндпоинт добавляется или меняется, чтобы backend, frontend и qa работали по одному описанию.
---

# Контракт web ↔ api

Источник истины: Swagger-декораторы и DTO в `apps/api`. Клиентские URL собраны в `apps/web/api.ts`.

## Как описывать эндпоинт в отчёте

```
POST /todos            (auth: cookie JWT, роль: любая)
Request:  multipart/form-data { title: string (1..200), file?: png|jpg|webp ≤5MB }
Response 201: { id, title, completed, createdAt, imageUrl|null }
Ошибки:   400 валидация | 401 нет сессии | 403 чужой ресурс | 404 не найдено
Что нужно от frontend: добавить API_URL.todos.create() в apps/web/api.ts, форма + i18n-ключи
Что проверить qa: happy path, пустой title, файл >5MB, чужой todoId
```

## Правила

- Меняешь контракт: обнови и api, и `apps/web/api.ts` в одном изменении, либо явно перечисли, что осталось другой стороне.
- Обратная совместимость: не удаляй и не переименовывай поля ответа, которые использует web, пока web не обновлён.
- Ответ описывай через DTO с `@ApiProperty`, чтобы Swagger совпадал с реальностью.
