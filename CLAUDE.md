# CLAUDE.md

Монорепо на Turborepo + pnpm (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). Весь код на TypeScript.

## Структура

| Путь | Что это | Стек |
|---|---|---|
| `apps/web` | Клиентское приложение | Next 16 (App Router, Turbopack), React 19, next-auth 5, next-intl, Tailwind 4, Radix / shadcn, react-hook-form + zod, Stripe |
| `apps/api` | Backend | NestJS 11, Prisma 7 (Postgres), BullMQ, RabbitMQ (amqplib), Redis (ioredis), JWT / passport, S3, SendGrid, react-email, Swagger |
| `packages/e2e` | E2E-тесты | Playwright |
| `packages/ui` | Общие React-компоненты (`@repo/ui`) | React |
| `packages/i18n` | Локали и сообщения (`@repo/i18n`), синхронизация через Crowdin | next-intl |
| `packages/eslint-config`, `packages/typescript-config` | Общие конфиги | |

### apps/web
Слои в духе Feature-Sliced Design: `app/[locale]` (роуты) → `widgets/` → `features/` → `shared/` (`ui`, `lib`, `hooks`, `utils`, `types`). Импортировать можно только из нижележащих слоёв. Все URL API собраны в `apps/web/api.ts` (`NEXT_PUBLIC_API_CLIENT_URL` для браузера, `NEXT_PUBLIC_API_SERVER_URL` для серверных компонентов).

### apps/api
Модули в `src/modules/<name>/`: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` (доступ к Prisma), `dto/`, `index.ts`. Конфиги в `src/config/`, Prisma в `src/prisma/` (`schema.prisma`, `migrations/`). `src/prisma/generated/` генерируется командой `prisma:generate`, руками не править.

## Команды

```bash
pnpm install
pnpm dev                          # все приложения через turbo
pnpm --filter web dev             # web на :3000
pnpm --filter api start:dev       # api (tsx watch, .env)
pnpm lint
pnpm check-types
pnpm --filter web test:run        # vitest
pnpm --filter api test            # jest
pnpm --filter api prisma:generate
pnpm test:e2e                     # build web + playwright (baseURL http://myapp.local)
docker compose up -d              # postgres, redis, rabbitmq, nginx, pgadmin
```

## Правила

- Перед тем как сказать «готово», прогоняйте `check-types`, `lint` и тесты затронутого пакета.
- Контракт между web и api — это эндпоинты Nest (Swagger). Меняете контракт — обновляйте обе стороны и `apps/web/api.ts` в одном изменении, либо явно опишите, что осталось другой стороне.
- Пользовательские тексты только через i18n (`packages/i18n/src/messages`), без строк, захардкоженных в компонентах.
- Секреты и токены не коммитить. `.env*` в `.gitignore`.
- Миграции Prisma: новые только через `prisma migrate dev --name <name>`. Уже применённые миграции не редактировать. `migrate reset` и удаление данных только после подтверждения пользователя.

## Агенты

В `.claude/agents/` лежат четыре агента: `frontend` (`apps/web`, `packages/ui`, `packages/i18n`), `backend` (`apps/api`), `qa` (тесты и проверка поведения) и `reviewer` (ревью diff, только чтение). Каждый правит только свою зону. Изменения в чужой зоне агент не делает, а описывает в отчёте.

Порядок работы над изменением: автор (`frontend` / `backend`) → `qa` → `reviewer` → исправления делает автор → PR → CI → approve и merge делает человек.

## Безопасность: плагин security-guidance

В `.claude/settings.json` включён плагин `security-guidance@claude-plugins-official`. Сейчас его платные LLM-ревью выключены (`"ENABLE_CODE_SECURITY_REVIEW": "0"` в `env`), чтобы не тратить токены. Работает только бесплатный слой: при каждом `Edit` / `Write` плагин предупреждает об опасных паттернах (секреты в коде, `innerHTML`, небезопасная десериализация и т. п.). Если плагин выдал предупреждение, агент исправляет проблему до того, как сдавать работу.

Выключенные слои: LLM-ревью diff в конце каждого хода и агентное ревью на `git commit` (ищет IDOR, обход авторизации, SSRF). Оба по умолчанию работают на Opus.
- Включить оба: удалить `ENABLE_CODE_SECURITY_REVIEW` из `env`.
- Включить только ревью на коммит (дешевле): вместо этого поставить `"ENABLE_STOP_REVIEW": "0"`.
- Выключить плагин целиком, вместе с предупреждениями: `"SECURITY_GUIDANCE_DISABLE": "1"`.
