# FIX: известные проблемы, которые ещё не исправлены

Приоритеты: **P1** — безопасность, **P2** — неверное поведение, **P3** — гигиена. Номера строк могут уехать, ищите по имени функции. Исправленный пункт удаляйте из файла.

Полный отчёт тестирования 2026-11-20 (L0–L5, все исходные находки с описанием) лежит в истории: `git show 5fbefd3:FIX.md`. Решения и контракт исправлений — в `docs/fix-plan.md`.

---

## Статус на 2026-11-21

Ветка `cc/qa-fixes`, три волны исправлений:

| Коммит    | Что                                                                                                                                                                                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5306016` | Волна 1: 2FA через одноразовый `loginTicket`, подтверждение почты по подписанному токену, захват аккаунта, IDOR и allowlist в биллинге, формат ошибок, ValidationPipe на dev, загрузки, rate limit, todos в браузере, защита маршрутов, a11y форм, Dockerfile, nginx, compose, CI |
| `25660b5` | Волна 2: вебхуки Stripe и письма через BullMQ, отзыв сессий (`sessionVersion`), `next` 16.4.6, `next-auth` beta.32, `@auth/core` 0.41.3, `@nestjs/*`, тёмная тема, даты и валюты по локали, страница `verify-email`                                                               |
| `25fd44c` | Волна 3 (по reviewer и security): DoS через `file-type`, `otpChallenge`, внутренний секрет web → api, лимиты SMS, 2FA с паролем, logout на сервере, вебхуки без потерь при resend, checkout без побочных эффектов на GET                                                          |

Закрыты все P1 из исходного отчёта, кроме тех, что требуют действий человека (ниже). `pnpm audit --prod`: было 12 critical и 72 high, стало 0 critical и 0 high (21 moderate, 4 low); шаг audit в CI теперь обязательный.

Локально зелёные `typecheck`, `lint` и тесты: api unit 364, api интеграция 274 (38 black-box пропущены без стека), web 259, e2e typecheck.

---

## Нужно человеку

- **P1. Сменить пароль e2e-аккаунта** из старого `packages/e2e/tests/auth.setup.ts` и **пароль Postgres** из старого `infra/helm/values/prod/postgresql.yaml`: оба остаются в истории git. Решить, переписывать ли историю.
- **Секреты и переменные** (новые с волн 1–3, образцы в `apps/api/.env.example` и `apps/web/.env.example`):
  - `INTERNAL_API_SECRET` (≥ 32 символа) — одинаковый в `apps/api/.env` и `apps/web/.env`; без него в production api отклоняет `validate`, вход не работает;
  - api: `EMAIL_FROM` (обязателен в production), `EMAIL_PROVIDER`, `EMAIL_VERIFICATION_SECRET`, `RABBITMQ_URL` (теперь обязателен), `SMS_DEV_MOCK=true` только для dev и e2e с 2FA (код `123456`), `SMS_DAILY_LIMIT`;
  - web: `AUTH_COOKIE_DOMAIN` (пусто — cookie только для текущего хоста);
  - k8s Secret `postgres-credentials` (ключи `password`, `postgres-password`) в namespace `database`; те же переменные api и web в окружении деплоя.
- **Docker** (демон отвечал I/O error, диск был заполнен): освободить место, перезапустить Docker Desktop, затем `docker builder prune`, пересобрать образы (compose теперь собирает api с `target: dev`), `docker compose up -d --force-recreate nginx redis`, проверить `docker compose exec nginx nginx -t`.
- **Удалить тестовые данные из dev-БД**: пользователи `qa-e2e-%@example.test` и `qa-explore-*`, их задачи, тестовый клиент Stripe.
- **Перед первым платежом** вызвать `POST /api/billing/products/sync` под ADMIN: цены проверяются по таблице `Product`, пока она пустая, любая покупка получает `400`.
- В GitHub: включить Dependabot для actions, завести секреты для будущего Playwright-джоба (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`). Сверить SHA `aquasecurity/trivy-action`.
- Отформатировать `.claude/**` (исключён из prettier, правит только человек), удалить `.playwright-mcp/`.

---

## Не проверено (нужен живой стек)

- **P1. Playwright (L3) после исправлений не запускался.** Спеки обновлены под новый поток (OTP-шаг, `otpChallenge`, скрытые forgot-password и OAuth, `callbackUrl`, выход после смены email/пароля/2FA, checkout по кнопке) и проходят typecheck, но с `test.fixme` сняты только по коду. Прогнать весь набор на стеке, logout — несколько повторов.
- Сборка prod-образа api (`docker build --target prod`), `docker-smoke` и `api-e2e` в CI, `nginx -t` для портов 80 и 8080, `docker compose config`, `actionlint`, `helm lint` (ключ `commonConfiguration` у bitnami redis 27.0.14 взят по памяти).
- Живые интеграции: S3, Twilio (SMS-2FA), Stripe (оплата, вебхуки через очередь), SendGrid/Resend, RabbitMQ. Всё проверено только на моках и fake Redis.
- Black-box тесты api (`API_E2E_URL`) и exploratory (L4) повторно не проходились.
- CORS для `POST /billing/checkout` из браузера (теперь вызывается клиентом с cookie).

---

## Открытые пункты

### P2. Покупка одной и той же разовой фичи второй раз не создаёт запись [волна 3]

- **Где:** `apps/api/src/modules/billing/finance/webhooks/payment.processes.ts` (`handleOneTimePurchase`), `FeatureRepository.hasUserFeature`.
- **Сейчас:** защита от дубля при ретрае проверяет пару `userId` + `priceId`. Повторная легитимная покупка того же one-time продукта новую `UserFeature` не создаст.
- **Нужно:** `paymentIntentId` в `UserFeature` с уникальным индексом (миграция) и проверка по нему; либо продуктово подтвердить, что разовую фичу покупают один раз.
- **Кому:** backend (миграция — с доступом к БД).

### P2. Отзыв сессий держится только на Redis [волна 2]

- **Где:** `apps/api/src/modules/redis/session-version.ts`, `jwt-auth.guard.ts`.
- **Сейчас:** `session-version:<userId>` хранится только в Redis. Redis теперь с AOF и `noeviction`, но при потере данных версии вернутся к 0, и отозванные сессии снова станут валидными. Роль берётся из JWT: понижение роли не отзывает сессию.
- **Нужно:** `tokenVersion` в таблице пользователя (миграция) с кэшем в Redis; отзыв при смене роли.
- **Кому:** backend.

### P2. Нет Dockerfile для web; helm-чарт `infra/helm/app` — заготовка nginx [L5-infra]

- **Нужно:** `output: "standalone"` в `next.config`, `apps/web/Dockerfile`, web в matrix `docker.yml`; чарт приложения (api и web, `securityContext`, секреты, порт 8080 у nginx-образа, security-заголовки в ingress).
- **Кому:** devops, frontend.

### P2. CSP только в режиме Report-Only [L5-security]

- **Где:** `nginx/snippets/csp-report-only.inc`; в боевом режиме действует только `frame-ancestors`.
- **Нужно:** собрать нарушения, перевести в `Content-Security-Policy`; продублировать в ingress.
- **Кому:** devops, frontend.

### P2. Playwright не запускается в CI [L0, L5-infra]

- **Нужно:** джоб с поднятым стеком (compose), тестовый пользователь из секретов, `SMS_DEV_MOCK=true`, отчёт артефактом.
- **Кому:** devops, qa.

### P3. Капча не проверяет `action` и `hostname` [L5-security]

- **Где:** `apps/api/src/modules/captcha/`.
- **Нужно:** сверять `action` и `hostname` из ответа reCAPTCHA, порог score из конфига; удалить остатки Turnstile.
- **Кому:** backend.

### P3. Мелочи UX и a11y [L5-a11y, волна 2]

- Нет skip-link в корневом layout.
- `metadata` в `app/layout.tsx` и `not-found.tsx` не переведены.
- Мелкий текст в SVG-иллюстрациях лендинга (`widgets/landing/illustrations`).
- Формы на `noValidate`: нативных подсказок нет, только свои ошибки (проверить со скринридером).
- Мобильный сайдбар: проверить на 375px в браузере, при необходимости `Sheet`.
- Неиспользуемый ключ i18n `payment_new_error_save`; `widgets/auth/*` (`auth-button-google`, `auth-form`) нигде не подключены.
- **Кому:** frontend, designer.

### P3. Гигиена инфраструктуры [L5-infra]

- `label-backup` в compose монтирует `docker.sock`.
- Доступны мажорные обновления `bullmq` 6, `@nestjs/cli` 12, `@nestjs/testing` 12; 21 moderate в `pnpm audit`.
- Один раз падал `AuthController wrong password → 401` в полном прогоне `api test:e2e` (повторы проходят): похоже на тайминг bcrypt под нагрузкой.
- **Кому:** devops, backend, qa.

### P3. Мелочи в коде [исходный FIX.md]

- Тексты части исключений api на русском (например, `ForbiddenException` в `todo.service.ts`). Пользователю они не видны: web показывает текст по полю `code` через `common.errors.*`. Перевести на английский или убрать текст, оставив код.
- `apps/api/src/prisma/generated` — закоммиченный старый клиент, его никто не импортирует. Удалить вместе с ассетом в `apps/api/nest-cli.json` (согласовать с человеком).
- Картинки todo из S3 показываются через `<img>` с `eslint-disable`; для `next/image` нужен хост бакета в `images.remotePatterns`.
- **Кому:** backend, frontend.
