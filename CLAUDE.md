# CLAUDE.md

Этот файл — руководство для Claude Code (и людей) по работе с репозиторием **human-system-design**.

> Корневой `README.md` — это неизменённый шаблон Turborepo (упоминает несуществующее приложение `docs`). Ориентируйтесь на этот файл.

## Обзор

SaaS-приложение в монорепозитории: Next.js-фронтенд + NestJS-бэкенд. Функциональность: аутентификация (email/пароль, Google, GitHub, 2FA по SMS), профиль пользователя, биллинг и подписки через Stripe, счета (PDF в S3), список задач (todos) с загрузкой изображений, e-mail/SMS-уведомления, локализация (en/uk), фичефлаги, аналитика и мониторинг.

## Стек технологий

| Слой | Технологии |
|---|---|
| Монорепо | **pnpm 9** workspaces (`apps/*`, `packages/*`), **Turborepo 2**, TypeScript 5.8, Node ≥18 (CI и Docker — Node 22) |
| Фронтенд (`apps/web`) | **Next.js 16** (App Router, Turbopack в dev), **React 19**, **NextAuth v5 (beta)**, **next-intl 4**, **Tailwind CSS 4** + **shadcn/ui** (Radix UI), react-hook-form + **zod 4**, Stripe Elements, Recharts, framer-motion, sonner, GrowthBook (фичефлаги), Amplitude, Cloudflare Turnstile (`@marsidev/react-turnstile`) |
| Бэкенд (`apps/api`) | **NestJS 11** (Express), **Prisma 7** + PostgreSQL (driver adapter `@prisma/adapter-pg`), Redis (ioredis, throttler storage), **RabbitMQ** (amqplib, собственный модуль), Stripe, AWS S3, SendGrid / Resend + React Email, Twilio, pdfkit/pdf-lib, prom-client (метрики), Swagger, class-validator/class-transformer, Joi |
| Тесты | Vitest + Testing Library + jsdom (web), Jest + ts-jest (api), **Playwright** (e2e, `packages/e2e`) |
| Мониторинг | Sentry (`@sentry/nextjs`, конфиги в корне), Prometheus `/metrics`, Grafana |
| Инфраструктура | Docker / docker-compose, nginx, Kubernetes (minikube), Helm, **ArgoCD** (GitOps), cert-manager, ingress-nginx, GitHub Actions |
| i18n | `packages/i18n` + Crowdin (`crowdin.yml`) |

## Структура репозитория

```
apps/
  web/        Next.js-фронтенд (порт 3000)
  api/        NestJS-бэкенд (порт из SERVER_PORT; в Docker/nginx — 3001)
packages/
  i18n/               @repo/i18n — локали, routing next-intl, JSON-сообщения (en, uk)
  ui/                 @repo/ui — заглушка React-библиотеки (button, card, code); фактически почти не используется
  eslint-config/      @repo/eslint-config — base / next-js / react-internal
  typescript-config/  @repo/typescript-config — base / nextjs / react-library
  e2e/                Playwright-тесты (Page Object Model)
infra/
  k8s/        namespace, storageclass, networkpolicy, priorityclass, clusterissuer
  helm/       app/ (собственный чарт), vendors/ (postgresql, redis, grafana, prometheus, ...), values/, secrets/
  argocd/     root-app (app-of-apps) + applications/*
  scripts/    bootstrap.sh / destroy.sh — поднять/снести кластер в minikube
pages/        остатки Sentry-примера (Pages Router), к приложению не относятся
.github/      workflows/ (ci, docker, helm, release, security, codeql, nightly, cleanup), actions/verify-project
              ("workflows copy/" — устаревшая копия, не используется GitHub)
```

## Архитектура

### Поток запросов

```
Браузер ──► nginx (myapp.local:80)
             ├─ /api/auth/*  ──► web:3000   (NextAuth)
             ├─ /api/*       ──► api:3001/  (префикс /api срезается)
             └─ /*           ──► web:3000   (Next.js)
```

- Локальная разработка рассчитана на домен **`myapp.local`** (добавьте в `/etc/hosts`): на него настроены nginx, `allowedDevOrigins` в `next.config.js`, домен cookie сессии (`.myapp.local`) и `baseURL` Playwright.
- Фронтенд обращается к API через две переменные: `NEXT_PUBLIC_API_CLIENT_URL` (из браузера) и `NEXT_PUBLIC_API_SERVER_URL` (из серверных компонентов). Все URL собраны в `apps/web/api.ts` (`API_URL`).

### Аутентификация

- Сессию выпускает **NextAuth** на фронтенде (стратегия JWT, cookie `next-auth.session-token` / `__Secure-next-auth.session-token`). Credentials-провайдер проверяет логин через `POST /service-auth/validate` бэкенда; также есть Google и GitHub.
- Бэкенд **не выпускает собственные токены для сессии**: `AuthGuard` (`apps/api/src/modules/auth/guards/jwt-auth.guard.ts`) читает cookie NextAuth и расшифровывает её через `@auth/core/jwt` с общим секретом `AUTH_SECRET`/`NEXTAUTH_SECRET`. Секрет должен совпадать в `apps/web/.env` и `apps/api/.env`.
- Роли: декоратор `@Roles()` + `RolesGuard`; текущий пользователь — `@GetUser('id')`.
- Middleware Next.js находится в `apps/web/proxy.ts` (в Next 16 `middleware.ts` → `proxy.ts`): редиректы для защищённых/auth-страниц (`constants/routes.ts`) + `next-intl` middleware.

### Фронтенд (`apps/web`) — Feature-Sliced Design

```
app/[locale]/...   маршруты App Router (login, create-account, dashboard, todos, settings, billing, pricing, checkout, ...)
app/api/auth/[...nextauth]/route.ts   обработчик NextAuth
widgets/           крупные составные блоки (header, sidebar, auth, checkout-form, billing-settings, ...)
features/          пользовательские действия (change-email-form, two-factor-form, add-card-form, subscription-*, logout, ...)
shared/            lib (utils, stripe, zod, price), hooks, types, ui, styles/globals.css, fonts, mock
components/ui/     сгенерированные shadcn/ui-компоненты (components.json) — не править вручную без нужды
providers/         Intl, GrowthBook, Google captcha
constants/         ROUTE / ROUTES, feature-flags
i18n/              request.ts (загрузка сообщений из @repo/i18n), navigation.ts
```

- Каждый slice экспортирует публичный API через `index.ts`; импортируйте из slice, а не из внутренних файлов.
- Алиас `@/*` → `apps/web/*`.
- Все URL локализованы: `localePrefix: "always"`, локали `en` (по умолчанию) и `uk`. Тексты — только через `next-intl` и JSON в `packages/i18n/src/messages/<locale>/*.json` (namespace = имя файла: `auth`, `common`, `todo`, `pricing`, `checkout`, `profile`). При добавлении ключа обновляйте **обе** локали (источник для Crowdin — `en`).

### Бэкенд (`apps/api`) — модульный NestJS

- Точка входа `src/main.ts`: `cookie-parser`, глобальный `ClassSerializerInterceptor` (стратегия `excludeAll`), `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` + `transform`), CORS на `CLIENT_URL`, Swagger на **`/docs`**, `rawBody: true` (нужно для вебхуков Stripe).
- Корневой модуль: `src/modules/app.module.ts`. Глобальный `ThrottlerGuard` (10 запросов / 60 с, хранилище в Redis).
- Модули в `src/modules/`:
  - `auth` (`/service-auth`), `user` (`/user`), `todo` (`/todos`)
  - `billing/*`: `finance` (`/billing` — checkout, portal session, payment intents, вебхуки Stripe в `finance/webhooks`), `subscription`, `payment-method`, `invoice`, `product`, `feature`, `payments` (провайдер Stripe)
  - `sender/email` (`/sender/emails`, SendGrid/Resend, шаблоны в `src/emails/templates/*.tsx`), `sender/sms` (`/sender/sms`, Twilio)
  - `storage` (S3), `pdf`, `captcha`, `cache`, `redis`, `metrics` (`/metrics`, Prometheus), `rabbitmq`
- **Слои внутри модуля:** `*.controller.ts` → `*.service.ts` → `*.repository.ts` (единственное место работы с `PrismaService`) + опционально `*.mapper.ts`.
- **DTO:** `dto/request/{body,params,query}/<entity>-<action>.<kind>.dto.ts`, `dto/response/*.response.dto.ts`, `dto/common/*`. Ответы сериализуются декоратором `@Serialize(ResponseDto)` (`src/interceptors`) с `excludeExtraneousValues: true` — **поля ответа без `@Expose()` не попадут в ответ**.
- Внедрение зависимостей — явно через `@Inject(Service)` в конструкторах (проект запускается через `tsx`, который не эмитит метаданные декораторов, поэтому не полагайтесь на автоматический вывод типов DI).
- Пути-алиасы (`tsconfig.json`, `baseUrl: ./`): `config/*`, `interceptors/*`, `prisma/*`, `utils/*`, `emails/*`, `modules/*`.
- Конфигурация: `@nestjs/config`, файлы в `src/config/` (app, database, redis, cache, queue); `.env` читается из `apps/api/.env`.
- **RabbitMQ** (`src/modules/rabbitmq`): собственный глобальный модуль `RabbitMQModule.forRootAsync` — менеджеры соединения/каналов/очередей/биндингов, продюсеры и консьюмеры (`email`, `order`, `notification`), сериализаторы, ретраи. BullMQ/Bull Board отключены (закомментированы в `app.module.ts`), но зависимости остались.
- **Prisma:** схема `src/prisma/schema.prisma` (модели `User`, `UserProfile`, `AuthSettings`, `UserBillingProfile`, `Subscription`, `Product`, `UserPurchase`, `UserFeature`, `Invoice`, `Todo`), миграции в `src/prisma/migrations/`. Клиент импортируется из `@prisma/client` — после изменения схемы обязательно выполнить `prisma generate`.

## Команды

Менеджер пакетов — **pnpm** (в корневом `package.json` поле `packageManager` продублировано: `npm` и `pnpm`; действует `pnpm@9.0.0`). Все команды — из корня репозитория.

### Установка и подготовка

```bash
pnpm install
pnpm --filter api exec prisma generate --schema=src/prisma/schema.prisma   # генерация Prisma Client (обязательно до typecheck/build api; без --schema схема не находится)
pnpm --filter api exec prisma migrate dev --schema=src/prisma/schema.prisma   # применить миграции (нужен DATABASE_URL)
```

### Запуск в режиме разработки

```bash
pnpm dev                          # turbo: web (next dev --turbopack :3000) + api
pnpm --filter web dev             # только фронтенд
pnpm --filter api start:dev       # только API: dotenv -e .env -- tsx watch src/main.ts
docker compose up                 # весь стек: nginx, web, api, postgres, redis, rabbitmq, pgadmin(:5050)
```

RabbitMQ Management UI — http://localhost:15672. Для работы через nginx нужен `myapp.local` в `/etc/hosts`.

### Сборка

```bash
pnpm build                        # turbo run build (все пакеты)
pnpm --filter web build           # next build
pnpm --filter api build           # nest build → apps/api/dist
pnpm --filter api start:prod      # node dist/main
```

### Проверка типов

```bash
pnpm turbo run typecheck          # то, что запускает CI (web и api: tsc --noEmit)
pnpm check-types                  # turbo run check-types (web и packages/ui)
pnpm --filter web typecheck
pnpm --filter api typecheck
```

### Тесты

```bash
# Unit (web, Vitest)
pnpm --filter web test:run        # однократный прогон
pnpm --filter web test            # watch-режим
pnpm --filter web test:coverage   # покрытие v8 (app, widgets, features, shared; components/ui исключён)
pnpm --filter web exec vitest run widgets/auth/auth-form-button   # один файл/каталог

# Unit (api, Jest; файлы *.spec.ts в src/)
pnpm --filter api test
pnpm --filter api exec jest src/modules/todo   # по пути
pnpm --filter api test:cov

# E2E (Playwright, packages/e2e)
pnpm test:e2e                     # собирает web, затем playwright test
pnpm test:e2e:ui                  # UI-режим Playwright
pnpm --filter e2e exec playwright test tests/settings.spec.ts   # один файл
```

E2E-тесты ходят на `http://myapp.local`, т.е. требуют поднятого стека (`docker compose up`). Проекты Playwright: `setup` (логин, сохраняет `playwright/.auth/user.json`), `no-auth` (create-account), `authenticated` (billing, settings, change-email). Page Objects — в `packages/e2e/pages/`.

### Линт и форматирование

```bash
pnpm lint                         # turbo run lint
pnpm --filter api lint            # eslint --fix (typescript-eslint type-checked + prettier)
pnpm format                       # prettier --write по всему репо
```

### i18n (Crowdin, нужен `CROWDIN_TOKEN`)

```bash
pnpm i18n:upload
pnpm i18n:download
```

### Kubernetes

```bash
./infra/scripts/bootstrap.sh      # minikube + helm-репозитории + ArgoCD (app-of-apps из infra/argocd)
./infra/scripts/destroy.sh
```

## CI

`.github/workflows/ci.yml` (push/PR в `main`, `develop`) вызывает composite action `.github/actions/verify-project`: `pnpm install --frozen-lockfile` → `turbo run lint` → `turbo run typecheck` → `turbo run test` → `turbo run build` → сборка Docker-образа. Джоба помечена `continue-on-error: true`, т.е. **падения не блокируют merge** — не считайте зелёный CI доказательством корректности.

## Известное состояние и подводные камни (проверено 2026-11-12)

- **Типы не проходят.** `tsc --noEmit` в `apps/web` — ~42 ошибки; в `apps/api` — ~39 ошибок после `prisma generate` (без генерации — ~71: `Property 'user' does not exist on type 'PrismaService'`). Основные источники в api: модуль `rabbitmq` (несовместимость с типами `amqplib`), `pdf.processor.ts` (ссылка на `Job` из отключённого BullMQ). `next build` при этом проходит, т.к. в `next.config.js` стоит `typescript.ignoreBuildErrors: true`. Не вносите новые ошибки; сверяйтесь с количеством до/после изменения.
- **`apps/api/tsconfig.json`**: `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`.
- **Линт web падает** с `ERR_MODULE_NOT_FOUND: Cannot find package 'globals'` — пакету `@repo/eslint-config` не хватает зависимости `globals`. Скрипт `lint` в web заканчивается на `|| true`, поэтому ошибка не видна в turbo.
- **Линт api** проверяет и сгенерированный Prisma-клиент (`src/prisma/generated/**`) — это ~10 тыс. «ошибок». Без него — ~600. При проверке своих изменений запускайте eslint на конкретных файлах.
- **`packages/ui`**: `check-types` падает — `@repo/typescript-config/react-library.json` не резолвится (у `packages/ui` нет `node_modules`, workspace-зависимости не слинкованы; лечится `pnpm install` из корня).
- **Тестов мало:** в web один unit-тест (`widgets/auth/auth-form-button/auth-form-button.test.tsx`), в api spec-файлов нет (`jest` завершается с «No tests found», а скрипт `test:e2e` указывает на отсутствующий `test/jest-e2e.json`). Скрипт `test:unit` в web вызывает `jest`, который в web не установлен — используйте Vitest.
- **Порты API:** `main.ts` слушает `SERVER_PORT` (обязателен, иначе исключение), Joi-схема валидирует `PORT`, а nginx/Dockerfile ожидают **3001**.
- В `apps/web/api.ts` e-mail-эндпоинты указаны как `/emails/...`, а контроллер на бэкенде — `sender/emails`.
- Опечатка в имени каталога `apps/web/features/ouath-connections` (а не `oauth`) — учитывайте при импортах.
- Встречаются черновые/дублирующие файлы: `login/page copy.tsx`, `todos/todos-list2.tsx`, `.github/workflows copy/`, `apps/api/src/prisma.config.ts` (дубль `src/prisma/prisma.config.ts`), пустой `full_backup.sql`.
- В репозиторий закоммичены артефакты Playwright (`packages/e2e/playwright-report/`, `test-results/`, `playwright/.auth/user.json`) и файлы в `infra/helm/secrets/`, `api-secret.yaml` — не добавляйте туда реальные секреты.

## Соглашения

- Код и комментарии — на TypeScript; комментарии и сообщения об ошибках в коде часто на русском — это нормально.
- Prettier: в api — одинарные кавычки (`apps/api/.prettierrc`); в web — двойные кавычки.
- Файлы и каталоги — `kebab-case`; NestJS-файлы — `<name>.<type>.ts` (`todo.service.ts`, `todos.controller.ts`, `todo-create.body.dto.ts`).
- Новый API-эндпоинт: DTO запроса с class-validator → метод контроллера с Swagger-декораторами (`@ApiTags`, `@ApiResponse`) и `@Serialize(ResponseDto)` → сервис → репозиторий. Защищённые маршруты — `@UseGuards(AuthGuard, RolesGuard)`.
- Новый UI: базовые компоненты — через shadcn (`components/ui`), бизнес-логику — в `features/`/`widgets/` по FSD, с `index.ts`; строки — через `next-intl` в обеих локалях.
- Переменные окружения: `apps/web/.env` и `apps/api/.env` (в `.gitignore`, примеров `.env.example` нет). Ключевые: `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `SERVER_PORT`, `CLIENT_URL`, `AUTH_SECRET`/`NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_CLIENT_URL`, `NEXT_PUBLIC_API_SERVER_URL`, ключи Stripe, S3, SendGrid/Resend, Twilio, Google/GitHub OAuth.
