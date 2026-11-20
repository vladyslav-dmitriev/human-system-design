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
pnpm typecheck
pnpm --filter web test:run        # vitest
pnpm --filter api typecheck       # tsc (CI: turbo run typecheck)
pnpm --filter api test            # jest
pnpm --filter api prisma:generate
pnpm test:e2e                     # build web + playwright (baseURL http://myapp.local)
docker compose up -d              # postgres, redis, rabbitmq, nginx, pgadmin
pnpm format                       # prettier по всему монорепо
pnpm i18n:sync                    # Crowdin: выгрузка и загрузка переводов
pnpm --filter api exec prisma migrate dev --name <name>   # новая миграция
```

`apps/api` читает переменные из `apps/api/.env` (`start:dev` через dotenv), `apps/web` из `apps/web/.env*`. Образцы переменных: `apps/api/.env.example` и `apps/web/.env.example` (копируй в `.env`, значения секретов подставляй свои). Агентам чтение `.env*` запрещено, `.env.example` читать можно.

## Правила

- Перед тем как сказать «готово», прогоняйте `typecheck`, `lint` и тесты затронутого пакета.
- Контракт между web и api — это эндпоинты Nest (Swagger). Меняете контракт — обновляйте обе стороны и `apps/web/api.ts` в одном изменении, либо явно опишите, что осталось другой стороне.
- Пользовательские тексты только через i18n (`packages/i18n/src/messages`), без строк, захардкоженных в компонентах.
- Секреты и токены не коммитить. `.env*` в `.gitignore`.
- Миграции Prisma: новые только через `prisma migrate dev --name <name>`. Уже применённые миграции не редактировать. `migrate reset` и удаление данных только после подтверждения пользователя.

## Агенты

Агенты лежат в `.claude/agents/` (зоны и роли в их теле; `architect` необязателен и даёт только черновик плана). Каждый правит только свою зону, чужие изменения описывает в отчёте; `reviewer`, `security` и `architect` только читают. Вне `apps/*`: `packages/e2e` и тесты правит `qa`, `docs/design/` правит `designer`, остальные `packages/*`, корневые конфиги (`package.json`, `turbo.json`, `pnpm-workspace.yaml`) и `.github/**` правит `devops`. `.claude/**` и `CLAUDE.md` правит только человек (или основная сессия по его явной просьбе).

Скиллы из `.claude/skills/` подключаются через Skill по необходимости, список в теле агента. У `designer`, `frontend`, `backend`, `qa`, `devops` включена `memory: project` (`.claude/agent-memory/<агент>/`, коммитится).

### Новая крупная фича

Решения принимает основная сессия вместе с пользователем в plan mode; сабагенты не ведут диалог и не вызывают друг друга, `architect` даёт только черновик. Порядок:

1. Требования; для фич с UI `designer` готовит `docs/design/<feature>.md`.
2. План в `docs/<feature>.md`: решения, модель данных, контракт API (образец в `api-contract`), критерии приёмки, нужды `devops`.
3. Пользователь утверждает план.
4. `backend` и `frontend` параллельно по контракту, `devops` при необходимости, `qa` пишет сценарии по критериям приёмки.
5. `qa` проверяет → `reviewer` (+ `security` для auth, платежей, загрузок, доступа к данным) → автор исправляет → PR → CI → approve и merge делает человек.

Сабагент не помнит обсуждения: ссылайся на файл плана. Не зови агентов на мелочи (правка файла, вопрос по коду); `reviewer` и `security` запускай один раз на готовый diff; параллельно только независимые задачи.

Команды: `/feature <описание>` (весь конвейер), `/review`, `/verify`. Защита настроена в `.claude/settings.json`: `permissions.deny` (короткое ядро) и хуки из `.claude/hooks/` (`guard.py` разбирает команды по токенам и ловит обходы вроде `rm -fr` или `head .env`; `readonly-bash.py` даёт `reviewer`, `security`, `architect` только белый список Bash; защита применённых миграций; prettier). Детали в самих файлах.
