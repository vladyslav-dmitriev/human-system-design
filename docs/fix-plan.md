# План исправлений по FIX.md

Ветка `cc/qa-fixes` (от `cc/project-full-testing-85594e`). Источник задач — `FIX.md` в корне. Этот файл — договорённости, общие для всех агентов: сабагент не помнит обсуждения, поэтому всё нужное здесь.

## Продуктовые решения (утверждены пользователем)

- **DELETE todo** остаётся только для ADMIN (`@Roles('ADMIN')`). Web показывает кнопку удаления только админу. Удаление несуществующей задачи → `404`, а не `500`.
- **Forgot-password и OAuth** скрываем до реализации: убрать ссылку «Забыли пароль?» и кнопки OAuth (вход и `ouath-connections` в настройках), страница `forgot-password` редиректит на login той же локали.
- **Вебхуки Stripe и отправка писем** — включаем BullMQ (волна 2, отдельная задача одного backend-агента).

## Общие правила для агентов волны 1

- Правь только свою зону и файлы из своего списка ниже. Нужна правка в чужом файле → опиши её в отчёте.
- Зависимости не меняй (кроме явно разрешённых). Обновления `next`, `next-auth`, `@nestjs/*` — волна 2.
- Схему Prisma и миграции не трогай (БД с хоста недоступна; всё, что требует миграции, — волна 2).
- Тесты не правь: этим займётся `qa` в волне 3. Тесты с `it.failing` / `it.fails` / `test.fixme` и комментарием `BUG: см. FIX.md` после твоего фикса начнут «падать» с пометкой «expected to fail, but passed» — это ожидаемо, просто перечисли их в отчёте. Обычные (не помеченные) тесты ломать нельзя, кроме случаев, когда они проверяют старое неправильное поведение — тогда перечисли их.
- `.env*` не читать (только `.env.example`). Не коммитить. Docker-стек не останавливать, не перезапускать и не пересобирать.
- Пользовательские тексты только через i18n, ключи во всех локалях (`en`, `uk`).
- Перед отчётом: `typecheck`, `lint` и тесты своего пакета.
- Браузер, если нужен: одна вкладка, headless, в конце `browser_close`.
- Отчёт: какие пункты FIX.md закрыты (заголовок пункта), что сделано, что осталось и кому, какие помеченные тесты теперь проходят.

## Формат ошибок API

Тело ошибки: `{ statusCode, message, error, code }`. Бросаем стандартные исключения Nest с объектом: `throw new UnauthorizedException({ code: ErrorCode.AUTH_INVALID_CREDENTIALS, message: '...' })`. Глобальный фильтр (backend-platform) приводит любые исключения к этому формату, добавляет `code` по статусу, если его нет (`400` от ValidationPipe → `VALIDATION_FAILED`, `429` → `RATE_LIMITED`, `403` → `FORBIDDEN`, `404` → `NOT_FOUND`, `5xx` → `INTERNAL`, без утечки стека и текста Prisma).

Коды уже заведены (правит только основная сессия, новые — через отчёт):

- api: `apps/api/src/common/errors/error-code.ts` (`ErrorCode`);
- web: `apps/web/shared/lib/api-error.ts` (`getApiErrorCode(response)`, `apiErrorKey(code)`);
- тексты: `common.errors.<CODE>` в `packages/i18n/src/messages/{en,uk}/common.json`.

## Контракт

### Вход и 2FA (P1 «2FA обходится»)

| Запрос                                                   | Ответ                                                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /service-auth/login {email, password}` + reCAPTCHA | `401 {code: AUTH_INVALID_CREDENTIALS}` · `200 {twoFactorRequired: false, loginTicket}` · `200 {twoFactorRequired: true, phoneMasked}` и SMS на сохранённый номер |
| `POST /service-auth/verify-otp {email, code}`            | `200 {loginTicket}` · `400 {code: AUTH_INVALID_OTP}`                                                                                                             |
| `POST /service-auth/validate {loginTicket}`              | `200 {user}` (как сейчас отдаёт `validate`) · `401 {code: AUTH_TICKET_INVALID}`                                                                                  |
| `POST /service-auth/register` (как сейчас)               | повторный email → `409 {code: AUTH_EMAIL_TAKEN}`                                                                                                                 |

- `loginTicket` — 32 случайных байта (base64url). В Redis ключ `login-ticket:<sha256(ticket)>` → `userId`, TTL 300 с, одноразовый (`GETDEL`).
- OTP для входа: попытки ограничены (не больше 5 на код), код одноразовый.
- `validate` по email+паролю больше не существует. Web (`auth.ts`, `authorize`) получает в credentials только `loginTicket` и вызывает `validate`.
- nginx не пускает снаружи `/api/service-auth/validate` (вызывается только сервером web по внутреннему адресу).
- Email нормализуется (`trim().toLowerCase()`) при регистрации, входе и смене email.
- Пароль: от 8 до 72 байт (UTF-8) на обеих сторонах.

### Профиль и безопасность аккаунта

- `POST /sender/sms/send` — под `AuthGuard`, номер берётся из профиля пользователя, тело не принимает номер. Rate limit на пользователя.
- `POST /user/profile/2fa`: неверный код → `400 {code: USER_INVALID_OTP}`, успех → `{success: true}`. Ошибки не глотаются.
- `PATCH /user/profile` (смена email) требует `currentPassword`; неверный → `400 {code: USER_INVALID_PASSWORD}`, занятый email → `409 {code: USER_EMAIL_TAKEN}`; после смены `isVerified = false`. Ответ `{success: true}`.
- `PATCH /user/profile/password`: неверный текущий → `400 {code: USER_INVALID_PASSWORD}`, ответ `{success: true}`.
- `GET /user/profile`: убрать `verifiedToken`; `profile` и `authSettings` описать объектами (C9). Не отправлять тестовое письмо.
- Подтверждение почты без изменения схемы: токен = `base64url(userId.exp).hmac` на секрете из конфига, срок 24 ч. `POST /sender/emails/send-verification` — под `AuthGuard`, токен создаёт сервер, тело не принимает токен. `verify-email` проверяет подпись и срок → `400 {code: EMAIL_TOKEN_INVALID}`.
- Web: пути в `api.ts` — `/sender/emails/*` (C1).

### Биллинг

- Чужие PaymentIntent и payment method → `404 NOT_FOUND` (проверка владельца по Stripe customer пользователя).
- `products/sync` → `POST`, только `ADMIN`. Web больше не вызывает его при SSR.
- `priceId` в checkout и upgrade проверяется по таблице `Product`/`Price` в БД (allowlist) → `400 VALIDATION_FAILED`.
- Upgrade (C2): web отправляет тип, который принимает API (`subscription`), ветка рендера не должна давать `null`.

### Todos и платформа

- `PATCH /todos/:id` — тело только `{completed}` (C3, правит web).
- `DELETE /todos/:id` — ADMIN, несуществующая → `404`.
- `POST /todos/:id/upload-image` → `{imageUrl}`; лимит размера (5 МБ), тип по сигнатуре файла (`file-type`), только изображения.
- `GET /health` → `{status, redis}` с реальной проверкой Redis.
- Сериализатор: у каждого эндпоинта, где ответ сейчас `{}`, — response-DTO с `@Expose` (см. P2 «ClassSerializerInterceptor(excludeAll)»).

## Волна 1: агенты и файлы

| Агент                | Зона (только эти файлы)                                                                                                                                                                                                                                                                                                                                                                                                     | Пункты FIX.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **backend-auth**     | `apps/api/src/modules/{auth,user,sender,captcha}/**` (кроме `*.spec.ts`)                                                                                                                                                                                                                                                                                                                                                    | 2FA bypass (L1-web, L5-sec), verify-email без токена, PAID_API OTP, тестовое письмо в профиле, личный адрес в SendGrid, `login()` с именем, `createUser` без `verifiedToken`, `setTwoFactor`, неверные учётные данные 2xx, смена email/захват аккаунта, пароль без верхней границы и из 1 символа (серверная часть), SMS pumping, send-verification, C6, C7, C9, C10 для своих контроллеров                                                                                                                                                                                                                                                                                                                                                                                              |
| **backend-billing**  | `apps/api/src/modules/billing/**` (кроме `*.spec.ts`; вебхуки и BullMQ не трогать)                                                                                                                                                                                                                                                                                                                                          | IDOR в биллинге, `priceId` allowlist, `products/sync`, metadata в payment-intent DTO, сериализация webhook-ответа, C10 для биллинга                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **backend-platform** | `apps/api/src/main.ts`, `setup-swagger.ts`, `interceptors/**`, новый `src/common/filters/**`, `modules/app.*`, `modules/{todo,storage,metrics,cache,redis}/**`, `src/config/**`, `apps/api/package.json` (только scripts и добавление `helmet`, `file-type`), `tsconfig*.json` api                                                                                                                                          | ValidationPipe на dev (запуск без tsx или с метаданными декораторов), сериализатор `{}` (health, upload-image), deleteTodo 500, 500 вместо 4xx, загрузка файлов без лимитов, rate limit (trust proxy и ключ по IP клиента / пользователю), Swagger и метрики наружу (флаг в конфиге), security-заголовки api (helmet), валидация конфига, путь `start:prod` к `dist/src/main.js`, jest baseUrl-алиасы, todos: длинные и пустые заголовки (серверная часть)                                                                                                                                                                                                                                                                                                                               |
| **frontend-auth**    | `apps/web/{auth.ts,auth.config.ts,proxy.ts}`, `apps/web/constants/**`, `app/[locale]/(auth)/**`, `widgets/auth/**`, `features/{auth-buttons.tsx,logout,two-factor-form,change-email-form,change-password-form,ouath-connections}/**`, `app/[locale]/layout.tsx` (lang), i18n `auth.json`, `profile.json`                                                                                                                    | 2FA на web, signIn дважды, ошибки API и reCAPTCHA глотаются, 2FA-форма, вечный спиннер при неверном пароле и ошибке регистрации, пароль 8..72, защита маршрутов (один список и одна логика), редирект на логин с локалью и `callbackUrl`, sign out не завершает сессию, скрыть forgot-password и OAuth, `lang` у `<html>`, label и ошибки полей на формах входа/регистрации/профиля, `<main>`/`<h1>`/title на auth-страницах, смена email с `currentPassword`                                                                                                                                                                                                                                                                                                                            |
| **frontend-app**     | `apps/web/api.ts`, `apps/web/utils.ts`, `app/[locale]/(app)/**` (кроме auth-страниц), `app/[locale]/test/**` (удалить), `features/{add-card-form,billing-plans,current-subscription,subscription-*,upgrade-button,language-settings,select-language}/**`, `widgets/{billing-*,checkout-form,payment-cards,header,sidebar,extra-feature-card,promo-banner,role-badge}/**`, i18n `todo.json`, `checkout.json`, `pricing.json` | P1 todos не загружаются, список не обновляется после создания, C1, C2, C3, кнопка удаления только ADMIN, `upload-image` → `imageUrl`, sync не на SSR, AddCardForm блокируется, `/test` в проде, `alert`/`confirm` → диалоги и toast, клавиатура в todos, `/checkout` гостю, локаль в ссылках app-части, мобильный макет и обрезка выбора языка в шапке                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **devops**           | `Dockerfile*`, `.dockerignore`, `docker-compose*.yml`, `infra/**` (кроме секретов — см. ниже), `.github/**`, корневые `package.json`/`turbo.json`/`.gitignore`/`.nvmrc`                                                                                                                                                                                                                                                     | Прод-образ api: `CMD dist/src/main.js`, многоступенчатая сборка без исходников/dev-зависимостей/e2e; `.dockerignore` (e2e, `.env*`, `playwright`, отчёты); nginx: security-заголовки, `X-Forwarded-For`/`X-Real-IP`, `client_max_body_size`, монтирование каталога вместо файла, блок `/api/service-auth/validate`, `/api/metrics` и `/api/docs` наружу; compose: зависимости, healthchecks, лимиты; CI: prettier, api `test:e2e` (с сервисами Postgres/Redis), typecheck e2e, образ пушится только после зелёного CI, `docker.yml`/`helm.yml` с корректными условиями и закреплёнными версиями actions; `engines.node`, `.nvmrc`, удалить корневой `@sentry/nextjs`; пароль Postgres из `infra/helm/values/prod/postgresql.yaml` вынести в `existingSecret` (сам пароль сменит человек) |

Файлы, общие для нескольких агентов, не правит никто, кроме владельца из таблицы. Если пересечение всё-таки нужно — описать в отчёте.

## Волна 2 (последовательно)

1. Зависимости: `next` ≥ 16.4.1 (frontend); `next-auth` ≥ 5.0.0-beta.32 и `@auth/core` ≥ 0.41.3 одним изменением (frontend); `@nestjs/*` и остальное из `pnpm audit --prod` (backend); удалить bull-board, если не используется (backend).
2. BullMQ: включить очереди, вебхуки Stripe с проверкой подписи и идемпотентностью по `event.id`, отправка писем через очередь, `tokenVersion` для отзыва сессий после смены пароля/email (требует миграции — доступ к БД согласовать с пользователем).
3. Остаток a11y/i18n/UX: тёмная тема, даты и валюты по локали, состояния загрузки, токены цветов, мелкий текст.

## Волна 3

`qa` снимает `it.failing` / `it.fails` / `test.fixme` у исправленных багов, прогоняет L1–L3; `reviewer` + `security` на весь diff; автор исправляет; FIX.md: убрать закрытые пункты; PR.

## Только человек

- Сменить пароль e2e-аккаунта (он в истории git) и пароль Postgres из helm values; решить, переписывать ли историю git.
- `docker compose up -d --force-recreate nginx` после правок nginx; пересборка api-образа.
- Удалить тестовые данные из dev-БД (`qa-e2e-%@example.test`, `qa-explore-*`, их задачи, тестовый клиент Stripe).
- Отформатировать `.claude/**`, удалить `.playwright-mcp/`.

## Волна 2: детали (после коммита волны 1)

Docker сейчас недоступен (диск был заполнен, демон отвечает I/O error), поэтому всё, что требует миграции БД или живого стека, откладывается. Схему Prisma не трогаем.

### Отзыв сессий без миграции: `sessionVersion` в Redis

- api хранит `session-version:<userId>` в Redis (нет ключа = `0`).
- `POST /service-auth/validate` дополнительно отдаёт `user.sessionVersion: number`.
- Web кладёт `sessionVersion` в JWT next-auth (`jwt` callback при входе) и отправляет его как есть в cookie-сессии (api уже расшифровывает её в `AuthGuard`).
- `AuthGuard` api сравнивает `sessionVersion` из токена с Redis; расхождение или отсутствие поля в токене → `401 {code: UNAUTHORIZED}`. Старые сессии без поля считаются версией `0`.
- `INCR session-version:<userId>` при смене пароля, смене email, включении и выключении 2FA. После своей смены web заново входит (новый `loginTicket` не нужен: web делает `signOut` и отправляет на login с `callbackUrl`, либо, если сделать проще не выйдет, показывает сообщение «войдите снова»).
- Web: на `401 UNAUTHORIZED` от api — `signOut` и редирект на login той же локали с `callbackUrl`.

### Агенты волны 2

| Агент                                | Зона                                                                         | Что делает                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **backend-queues**                   | `apps/api/src/**` (кроме `prisma/schema.prisma`, `migrations`), тесты api    | BullMQ: вебхуки Stripe через очередь, идемпотентность по `event.id` (Redis `SET NX` с TTL 7 дней), 400 на неверную подпись без текста Stripe; отправка писем через очередь (провайдер из конфига, `EMAIL_FROM`), письмо подтверждения после регистрации и смены email; `sessionVersion` (выше); `/health` при недоступном Redis — `503 {status:'error', redis:'down'}` без стека в логе; 401 в Swagger у todos; jest `moduleNameMapper` для baseUrl-алиасов; `EMAIL_FROM` и `EMAIL_VERIFICATION_SECRET` в `.env.example` и валидацию конфига. Зависимости не меняет. |
| **frontend-deps-ux**                 | `apps/web/**`, `packages/i18n/**`, `apps/web/package.json`, `pnpm-lock.yaml` | `next` ≥ 16.4.1, `next-auth` ≥ 5.0.0-beta.32 и `@auth/core` ≥ 0.41.3 одним изменением; `sessionVersion` в JWT и обработка `401 UNAUTHORIZED`; домен cookie сессии из env вместо `.myapp.local`; остаток UX/a11y: тёмная тема, даты и валюты по локали, состояния загрузки, токены цветов вместо хардкода, мелкий текст и цели нажатия, карточки способа оплаты с клавиатуры, `hl` у reCAPTCHA по локали, `AddCardForm` без сырого `data.message`; удалить мёртвые `subscription-cancel` (эндпоинта нет) и `shared/lib/zod.ts` вместе с тестом.                       |
| **backend-deps** (после двух первых) | `apps/api/package.json`, `pnpm-lock.yaml`                                    | `@nestjs/*` и остальное из `pnpm audit --prod` для api; убрать bull-board, если не используется.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Отложено до живого Docker: миграции (`tokenVersion` в БД, если Redis-варианта мало), сборка образов, Playwright, `--force-recreate nginx`.

## Волна 3: правки по reviewer и security

### Изменения контракта

- **OTP-челлендж вместо email.** `POST /service-auth/login` при 2FA → `200 {twoFactorRequired: true, phoneMasked, otpChallenge}`; `otpChallenge` — 32 случайных байта base64url, в Redis под `login-otp:<sha256>` (TTL 300, хранит userId и счётчик). `POST /service-auth/verify-otp {otpChallenge, code}` → `{loginTicket}` | `400 AUTH_INVALID_OTP`. Счётчик попыток атомарный (Lua или MULTI), повторный `login` создаёт новый челлендж, но не сбрасывает лимит SMS.
- **Внутренние вызовы web → api.** Новый секрет `INTERNAL_API_SECRET` (≥ 32 символа, только на сервере web, не `NEXT_PUBLIC_*`). Сервер web шлёт его в заголовке `X-Internal-Secret` на `POST /service-auth/validate` и на SSR-запросы (в т.ч. `verify-email`), а также IP клиента в `X-Client-IP`. api: `validate` без секрета → `401 AUTH_TICKET_INVALID`, без IP-лимита; при верном секрете throttler берёт IP из `X-Client-IP`.
- **2FA.** `POST /user/profile/2fa {twoFactorEnabled, phone, code, currentPassword}`; неверный пароль → `400 USER_INVALID_PASSWORD`. Включение при уже включённой 2FA → `400 VALIDATION_FAILED` (сменить номер = выключить кодом со старого номера и включить заново). Pending-номер используется только при включении.
- **Выход.** `POST /service-auth/logout` (под `AuthGuard`) → `{success: true}`, делает `INCR session-version`. Web вызывает его перед `signOut`.
- **Повторное письмо.** `POST /sender/emails/send-verification` в окне 60 с → `429 RATE_LIMITED`.

### Агенты

| Агент    | Что делает                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| backend  | `image-upload.ts` без `file-type` (ручная проверка сигнатур jpg/png/webp), контракт выше, throttler: `service-auth/*` всегда по IP, `login` 10/мин, `TRUST_PROXY` по умолчанию 1 хоп, `@SkipThrottle` на вебхуке; SMS: лимит на номер и общий суточный потолок, SMS из `login` в том же счётчике; dev-код только при `SMS_DEV_MOCK=true` (запрещён в production через Joi); в production `AuthGuard` принимает только `__Secure-` cookie; вебхуки: удалять failed-задачу в `onFailed`, `handleSubscriptionSync` берёт свежую подписку из Stripe, one-time покупка не создаёт вторую фичу при ретрае, `cause` в ошибках; `/health` `clearTimeout`; убрать fallback-креды RabbitMQ и полное письмо в логе `email.consumer` |
| frontend | `otpChallenge` во входе, `X-Internal-Secret` и `X-Client-IP` в `authorize` и SSR (`api-server.ts`), поле `currentPassword` в 2FA-форме, вызов logout перед `signOut`, `maxAge` сессии 7 дней, очистка cookie в `proxy.ts` с `secure`/`httpOnly`/`sameSite`, `getSafeCallbackUrl` проверяет `//` и `\` после снятия локали, checkout создаёт PaymentIntent/подписку по действию пользователя, а не при SSR; без email и полного URL в GrowthBook                                                                                                                                                                                                                                                                          |
| devops   | `docker-smoke` с `EMAIL_FROM`, `nginx.Dockerfile` слушает 8080 (compose — 80), nginx `X-Forwarded-For $remote_addr` (nginx на краю), Redis AOF + `noeviction` в compose, `INTERNAL_API_SECRET` в `.env.example` обоих приложений и compose                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
