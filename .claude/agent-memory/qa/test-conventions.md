---
name: test-conventions
description: Non-obvious conventions for api jest specs, web vitest and e2e specs after wave 1 of docs/fix-plan.md
metadata:
  type: project
---

- apps/api unit jest (rootDir src) has no baseUrl aliases: a spec that imports a file using `interceptors`, `modules/...` or `prisma/...` must `jest.mock(name, factory, {virtual: true})` or mock the importing module. `apps/api/test/jest-e2e.json` has moduleNameMapper and needs none.
- apps/api/test/helpers: `app.ts` (mirrors main.ts: trust proxy, AllExceptionsFilter, ValidationPipe), `fake-redis.ts` (in-memory REDIS_CLIENT), `images.ts` (valid png/jpeg/webp buffers by signature).
- web vitest: `@/i18n/navigation` must be mocked in component tests (next-intl createNavigation imports next/navigation, not resolvable in vitest). No user-event; use fireEvent.
- e2e (not runnable without the docker stack): do not use `getByRole("alert")` (Next route announcer matches it too); assert by English i18n text, exported as *_TEXT constants in pages/*.ts.

**Why:** found while updating tests after wave 1 (2026-11-21). **How to apply:** reuse before writing new specs.
