# FIX: известные проблемы, которые ещё не исправлены

Список собран 2026-11-20, когда чинили ошибки typecheck/lint (PR #20). Проверки эти проблемы не ловят, их нужно чинить отдельными задачами. Номера строк могут уехать, ищите по имени функции. Исправленный пункт удаляйте из файла.

Приоритеты: **P1** — безопасность, **P2** — неверное поведение, **P3** — гигиена.

---

## P1. `verify-email` подтверждает почту без проверки токена

- **Где:** `apps/api/src/modules/sender/email/emails.controller.ts`, метод `verifyEmail` (`GET sender/emails/verify-email`).
- **Сейчас:** параметр `token` не используется (`_token`). Поиск пользователя по `verifiedToken` и обновление `isVerified` закомментированы. Эндпоинт всегда отвечает «Email успешно подтвержден!».
- **Нужно:** найти `authSettings` по `verifiedToken`. Если не найден или протух — `BadRequestException`. Иначе выставить `isVerified = true` и `verifiedToken = null`, всё в одной транзакции. Работа с БД через `UserRepository` (см. скилл `prisma-7`). Нужен тест на неверный токен.
- **Связано:** `EmailService.sendVerificationEmail` сейчас заглушка (см. «Почта не отправляется» ниже), письмо с токеном пользователю не уходит.

## P1. Без `PAID_API=enabled` любой SMS-код считается верным

- **Где:** `apps/api/src/modules/sender/sms/providers/twilio.service.ts`, `verifySmsCode` (и `sendSmsCode`).
- **Сейчас:** если `PAID_API !== 'enabled'`, `verifySmsCode` возвращает `true` для любого кода. Это касается 2FA при логине (`auth.service.ts`) и подтверждения телефона (`user.service.ts`). Если на проде переменная не задана, 2FA фактически выключена.
- **Нужно:** обход разрешать только при `NODE_ENV !== 'production'` (или с фиксированным тестовым кодом). На проде без настроенного Twilio — явная ошибка конфигурации при старте, а не молчаливое `true`.

## P2. Вебхуки Stripe ничего не делают

- **Где:** `apps/api/src/modules/billing/finance/webhooks/payment.handler.ts` — методы `handle*` возвращают `Promise.resolve()`. Код постановки в очередь закомментирован.
- **Сейчас:** `WebhookService.execute` проверяет подпись и вызывает хендлеры, но после `invoice.paid` и `payment_intent.succeeded` подписка, фичи и инвойсы в БД не обновляются. Логика лежит в `payment.processes.ts` (`PaymentProcessor`), но декоратор `@Processor` закомментирован, потому что BullMQ отключён. `config/queue.config.ts` целиком в комментариях, `utils/queue.ts` возвращает `[]`.
- **Нужно:** одно из двух. Либо включить BullMQ: раскомментировать `QUEUE`/`QUEUE_JOB`, `registerQueue`/`setupQueue` в модулях finance/invoice/pdf/email и `@Processor`. Либо временно вызывать методы `PaymentProcessor` напрямую из `PaymentHandler`. Нужна идемпотентность по `event.id` / `paymentIntent.id` (см. скиллы `stripe-payments` и `queues-bullmq-rabbitmq`). Затрагивает платежи, после изменений нужен `security`.

## P2. `getUserProfile` отправляет тестовое письмо на каждый запрос профиля

- **Где:** `apps/api/src/modules/user/user.service.ts`, `getUserProfile` — вызов `emailProducer.sendEmailUserCreate({ to: 'test@example.com', ... })`.
- **Сейчас:** каждый `GET users/profile` (его дёргают несколько страниц web при SSR) публикует сообщение в RabbitMQ. Если RabbitMQ недоступен, запрос профиля может падать или тормозить.
- **Нужно:** удалить отладочный вызов. Если нужна проверка RabbitMQ, вынести её в отдельный dev-эндпоинт или в health-check.

## P3. В SendGrid-провайдере зашит личный адрес отправителя

- **Где:** `apps/api/src/modules/sender/email/providers/sendgrid.service.ts`, `sendEmail` — `from` захардкожен личным gmail. В `recend.service.ts` так же захардкожен `onboarding@resend.dev`.
- **Сейчас:** поле `from` из `EmailMessage` игнорируется.
- **Нужно:** брать отправителя из конфига (`EMAIL_FROM` через `ConfigService`, добавить в `apps/api/.env.example` и валидацию в `src/config/validation.ts`), поле `from` из сообщения использовать как override. Личный адрес убрать из кода.

## P3. Захардкоженные тексты вместо i18n

Правило проекта: пользовательские тексты только через `packages/i18n/src/messages` (web) и `apps/api/src/emails/translates` / i18n (api).

- **web (примеры):**
  - тексты в `toast.error(...)` в `features/change-email-form`, `change-password-form`, `subscription-cancel`, `subscription-renew`;
  - `"Ошибка при отправке данных"` в `features/add-card-form/add-card-form.tsx`;
  - `"Не вдалося завантажити профіль користувача."` в `app/[locale]/(app)/settings/page.tsx`;
  - `"Unknown error"` в `widgets/checkout-form/checkout-form-content.tsx`.
- **api:** русские тексты в `BadRequestException` / `UnauthorizedException` / `ForbiddenException` (auth guards, captcha, todos controller, user service). Если они доходят до UI, web должен маппить код ошибки на ключ i18n, а не показывать текст бэкенда.
- **Как найти:** `grep -rnE "[А-Яа-яІіЇїЄє]" apps/web --include=*.tsx --exclude-dir=node_modules` (комментарии пропускать).
- **Нужно:** ключи во всех локалях (скилл `next-intl`), `pnpm i18n:sync`.

---

## Другое, замечено попутно

- **Почта не отправляется:** `EmailService.sendEmail` / `sendVerificationEmail` / `sendInvoiceEmail` — заглушки (очередь отключена). Чинить вместе с пунктом про вебхуки.
- **`apps/api/src/prisma/generated`:** закоммиченный старый сгенерированный клиент. Его никто не импортирует (рабочий клиент генерируется в `node_modules` через `pnpm --filter api prisma:generate`), из eslint он исключён. Можно удалить вместе с ассетом `../prisma/generated/**/*` в `apps/api/nest-cli.json`. Удаление согласовать с человеком.
- **`next/image` для картинок todo:** картинки из S3 показываются через `<img>` с `eslint-disable`. Чтобы перейти на `next/image`, нужен хост бакета в `images.remotePatterns` (`apps/web/next.config.js`).
- **Docker-образ локально не собирался** после правок Dockerfile (PR #20), проверялся только в CI.

---

# Полное тестирование, 2026-11-20

Прогон по уровням QA. Пометка в заголовке показывает, на каком уровне найдено: **L0** статика, **L1** unit, **L2** интеграция и контракт API, **L3** e2e Playwright, **L4** exploratory, **L5** security / a11y / инфраструктура. Стек: docker-compose из основного checkout (тот же коммит `ce46cf5`), `http://myapp.local`; внешние сервисы только на моках.

**Статус уровней:** L0 ✅, L1 api ✅, L1 web ✅, L2 ✅, L3 ⚠️ (агент остановлен до финального отчёта, см. раздел L3), L4 ✅ (два прохода; не проверены S3, SMS, оплата), L5 a11y/UX ✅, L5 security ✅, **L5 infra ❌ не сделан**: агент `devops` остановлен из-за лимитов, сборка Docker-образа не доведена. Инфраструктурные находки отчасти закрыты разделом security (Dockerfile, `.dockerignore`, workflows, compose, helm). Не проверены: сборка образов, CI-шаги для тестов, `turbo.json`, версии `pnpm`/`node`, probes/resources в helm.

## L0. Статика: что прошло

- `pnpm typecheck`, `pnpm lint` — зелёные.
- `prisma validate` — схема валидна.
- Ключи i18n `en` и `uk` совпадают (366 / 366, 7 неймспейсов).
- Unit: api 3 сьюта / 17 тестов, web 1 файл / 2 теста — все зелёные (это весь набор до тестирования).

## P1. В репозитории закоммичены реальные учётные данные и сессия для e2e [L0]

- **Где:** `packages/e2e/tests/auth.setup.ts` (логин реальным личным email и паролем, строки 13 и 16); `packages/e2e/playwright/.auth/user.json` (cookie `next-auth.session-token`, `authjs.csrf-token`); `packages/e2e/test-results/**/trace.zip` и `packages/e2e/playwright-report/**` (21 файл, в трейсах видны введённые пароль и cookies).
- **Сейчас:** всё лежит в git (коммит `efe0f0b add e2e tests`), в `.gitignore` нет правил для этих путей. Тот же пароль мог использоваться на проде или в других сервисах.
- **Нужно:** 1) сменить пароль этого аккаунта (и везде, где он повторяется), считать его скомпрометированным: он остаётся в истории git; 2) брать логин и пароль тестового пользователя из переменных окружения (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, с образцом в `packages/e2e`), отдельный тестовый аккаунт создавать сидом; 3) `git rm --cached` для `playwright/.auth`, `test-results`, `playwright-report` и добавить их в `.gitignore`; 4) по желанию вычистить историю (`git filter-repo`), это согласовать с человеком.
- **Кому чинить:** qa (`packages/e2e`) + devops (`.gitignore`) + человек (смена пароля).

## P1. Уязвимые зависимости: 12 critical, 72 high в prod-дереве [L0]

- **Где:** `pnpm audit --prod` по всему монорепо (168 уязвимостей: 19 low, 65 moderate, 72 high, 12 critical).
- **Critical:** `next@16.2.7` (RCE в image optimizer и `next/og`), `next-auth@5.0.0-beta.31` и `@auth/core` (обход нормализации email, ошибки конфигурации), `@sentry/nextjs@10.56.0` (обход middleware через tunnel route), `ejs` (template injection), `proxy-addr` (IP spoofing).
- **High (выборочно):** `axios`, `body-parser`, `multer`, `qs`, `path-to-regexp`, `follow-redirects`, `form-data`, `fast-uri`, `ws`, `sharp`, `postcss`, `zod`, `hono` (через `prisma` → `@prisma/dev`).
- **Нужно:** обновить `next`, `next-auth`/`@auth/core`, `@sentry/nextjs` до патченых версий, затем `@nestjs/*` (тянут `body-parser`, `multer`, `path-to-regexp`, `qs`), `axios`. После обновления прогнать полный набор проверок. Добавить `pnpm audit --prod --audit-level=high` в CI. Какие из уязвимостей реально эксплуатируемы в проекте, см. раздел L5-security.
- **Кому чинить:** devops (корневые зависимости, CI) + frontend (`apps/web`) + backend (`apps/api`).

## P2. Тесты не запускаются в CI, а api-скрипт `test:e2e` был битым [L0]

- **Где:** `.github/workflows/ci.yml`, `nightly.yml`; `apps/api/package.json` → `test:e2e` (`jest --config ./test/jest-e2e.json`).
- **Сейчас:** CI гоняет только lint и typecheck. Ни jest, ни vitest, ни playwright не запускаются. Папки `apps/api/test` не было, поэтому `pnpm --filter api test:e2e` падал.
- **Нужно:** добавить в CI шаги `pnpm --filter api test`, `pnpm --filter web test:run`, api e2e (конфиг создан на L2), позже playwright с сервисами. В `turbo.json` добавить таск `test`. Подробно см. раздел L5-infra.
- **Кому чинить:** devops.

## P3. `prettier --check` падает на 115 файлах, формат в CI не проверяется [L0]

- **Где:** `pnpm exec prettier --check "**/*.{ts,tsx,md}"`. Распределение: `.claude/skills` 79, `apps/web` 24, `apps/api` 6, `.claude/agents` 4, `CLAUDE.md`, `amplitude-setup-report.md`.
- **Нужно:** прогнать `pnpm format` по `apps/*` отдельным коммитом. Для `.claude/**` и `CLAUDE.md` либо добавить их в `.prettierignore`, либо форматировать только с разрешения человека (по правилам эти файлы правит только он). Потом добавить `prettier --check` в CI.
- **Кому чинить:** frontend/backend (формат кода), devops (CI, `.prettierignore`), человек (`.claude/**`).

<!-- L5-A11Y -->
## L5. Доступность и UX (`designer`)

Вживую проверены публичные страницы `/en`, `/uk`, login, create-account, forgot-password, 404 и редиректы на 375 / 768 / 1280 px. Защищённые страницы проверены по коду. Лендинг в целом в порядке: ландмарки, один `h1`, иерархия заголовков, нет горизонтального скролла, тач-таргеты 44px. Всё ниже чинит **frontend**.

## P2. Forgot-password — заглушка: «успех» без запроса к API [L5-ux]

- **Где:** `widgets/auth/auth-forgot-password/auth-forgot-password.tsx`.
- **Сейчас:** вместо вызова API `setTimeout`, затем тост «Инструкции отправлены на ваш email» (по-русски). Пользователь думает, что письмо ушло.
- **Нужно:** вызвать эндпоинт сброса пароля (если его нет в api — добавить, см. L2), показывать реальный результат, тексты через i18n.

## P2. У `<html>` нет `lang` ни на одной локали [L5-a11y]

- **Где:** `apps/web/app/layout.tsx` (`<html>` без `lang`), `app/[locale]/layout.tsx`.
- **Сейчас:** `document.documentElement.lang === ""` на `/en`, `/uk`, login, 404. Скринридер читает украинский текст английским голосом.
- **Нужно:** `lang={locale}` (через `getLocale()` в root layout или перенос `<html>` в `[locale]/layout`), для 404 вне локали — дефолтная. WCAG 3.1.1.

## P2. Поля форм без label, ошибки не связаны с полями и не озвучиваются [L5-a11y]

- **Где:** login (`login-auth-form-step.tsx`, OTP-шаг `login-auth-otp-step.tsx`), create-account (`widgets/auth/auth-form-input.tsx`, `auth-form-error.tsx`), forgot-password (`type="text"` вместо `email`), todos (`create-todo-form.tsx`: `<label>` без `htmlFor`; `todo-item.tsx`: `htmlFor="todo-{id}"` указывает на несуществующий id). Те же дефекты стоит проверить в `change-email-form`, `change-password-form`, `add-card-form`, `checkout-form`.
- **Сейчас:** только `placeholder`, `labels.length === 0`, нет `aria-invalid`/`aria-describedby`/`role="alert"`, нет `autoComplete`, текст ошибки 11px; `AuthFormError` всегда рендерит пустой `<p>`.
- **Нужно:** `Label` + `htmlFor`/`useId`, `aria-invalid`, `aria-describedby` на `<p role="alert">`, `autoComplete` (`email`, `current-password`, `new-password`), ошибки от 12px и не только цветом. WCAG 1.3.1, 3.3.1, 3.3.2, 4.1.2.

## P2. Действия в todos и иконки-кнопки недоступны с клавиатуры [L5-a11y]

- **Где:** `todos/todo-item.tsx` (`onClick` на SVG `TrashIcon`, `SquareCheckIcon`), `create-todo-form.tsx` (удаление превью); `widgets/header/header.tsx` (кнопка меню без `aria-label`/`aria-expanded`, подсказка только по hover и по-русски); `features/select-language/select-language.tsx` (имя «🇺🇸EN», `focus:ring-0` гасит фокус); `features/auth-buttons.tsx` (`<Link><Button>`: два Tab-стопа, невалидный HTML); `widgets/sidebar/sidebar.tsx` (подсказки только `group-hover`).
- **Сейчас:** завершить или удалить задачу с клавиатуры нельзя; часть кнопок без доступного имени.
- **Нужно:** настоящие `<Button variant="ghost" size="icon" aria-label>` (тексты через i18n), `Button asChild` для ссылок, подсказки через `Tooltip` и на focus, `aria-current="page"` в сайдбаре. WCAG 2.1.1, 2.4.7, 4.1.2.

## P2. Нативные `alert`/`confirm` для подтверждений и ошибок [L5-a11y]

- **Где:** `widgets/payment-cards/payment-cards.tsx:59`, `features/subscription-cancel/subscription-cancel.tsx:29`, `features/current-subscription/current-subscription.tsx:47`, `todos/todo-img-upload.tsx`, `todos/create-todo-form.tsx:77`.
- **Сейчас:** блокирующие нелокализованные диалоги (по-русски), после загрузки картинки в `alert` выводится ссылка на S3.
- **Нужно:** `AlertDialog` для необратимых действий, `toast` для сообщений, всё через i18n. WCAG 3.3.4, 4.1.3.

## P2. Нет `<main>` и `<h1>` на login, create-account, forgot-password, 404; одинаковый title [L5-a11y]

- **Где:** `widgets/sidebar/sidebar-wrapper.tsx` (ветка `hasNoSession` рендерит `<Header/>{children}` без `<main>`), `CardTitle` — это `div`, `app/not-found.tsx`; `metadata` в `app/layout.tsx`.
- **Сейчас:** `h1` нет, `main` нет; на всех страницах `<title>` «TaskFlow», description «Generated by create next app».
- **Нужно:** `<main id="main">`, заголовок формы как `h1`, `generateMetadata` с переведённым title на каждой странице. WCAG 1.3.1, 2.4.2.

## P2. Тёмная тема не работает [L5-a11y]

- **Где:** `shared/styles/globals.css`, `providers/providers.tsx`, `components/ui/sonner.tsx` (вызывает `useTheme()`, но провайдера нет).
- **Сейчас:** токены `.dark` есть, но класс `dark` никто не ставит. При `prefers-color-scheme: dark` меняется только `color-scheme`: нативные контролы тёмные, фон белый.
- **Нужно:** подключить `next-themes` (`attribute="class"`, `defaultTheme="system"`) и переключатель темы, либо явно оставить только светлую тему и убрать `color-scheme: dark`. Затем проверить контраст. WCAG 1.4.3, 1.4.11.

## P2. Нет мобильного макета у защищённых страниц, в шапке обрезается выбор языка [L5-a11y]

- **Где:** `widgets/sidebar/sidebar-wrapper.tsx` (`fixed w-40` и `pl-40` без брейкпоинтов, по умолчанию открыт), `widgets/header/header.tsx`.
- **Сейчас:** на 375px под контент остаётся около 215px (по коду). В неавторизованной шапке селектор `EN` уходит за правый край (видно на скриншоте).
- **Нужно:** на `<md` сайдбар как `Sheet`, по умолчанию закрыт; в шапке `flex-wrap` и одна CTA. WCAG 1.4.10.

## P2. Редирект на логин меняет локаль и теряет страницу возврата [L5-ux]

- **Где:** `apps/web/proxy.ts`, `constants/routes.ts`.
- **Сейчас:** после захода на `/uk` запрос `/en/dashboard` (и settings, billing, todos, pricing) уводит на `/uk/login`: локаль берётся из cookie, а не из URL. `callbackUrl` нет, после входа пользователь не возвращается на запрошенную страницу. `/en/checkout` без входа молча уводит на лендинг. Ссылки в `auth-buttons.tsx`, `header.tsx`, forgot-password сделаны через `next/link` или `<a>`, а не через `@/i18n/navigation`, поэтому префикс локали теряется и страница полностью перезагружается.
- **Нужно:** сохранять локаль из URL, добавить `callbackUrl`, единый `Link` из `@/i18n/navigation`. Решить, должен ли `/pricing` быть публичным: на лендинге есть якорь `#pricing`. WCAG 3.2.3.

## P2. Отладочная страница `/test` попадает в прод и не закрыта авторизацией [L5-ux, L4]

- **Где:** `app/[locale]/(app)/test/page.tsx` (форма с GET на `https://google.com` и кнопкой «ПРОВЕРКА ФОРМЫ»); маршрута нет в `ROUTES.protected` в `proxy.ts` (вывод по коду).
- **Нужно:** удалить страницу.

## P3. Захардкоженные тексты: дополнение к пункту «Захардкоженные тексты вместо i18n» выше [L5-ux]

Найдено дополнительно: `app/not-found.tsx` (английский на `/uk`), `auth-forgot-password.tsx` (тексты и сообщения валидации), `login-auth-form-step.tsx` («Email», «or», fallback), `login/page.tsx:92` (fallback «Неверный email или пароль»), `features/auth-buttons.tsx` («New account», `RoleBadge text="Admin"`), `widgets/header/header.tsx`, весь `todos/*` (`create-todo-form`, `todos-list`, `todo-img-upload`, `todo-sort`), `payment-cards.tsx`, `billing/cancel/page.tsx`, `metadata` в `app/layout.tsx`. В кнопках Google/GitHub `<span>G</span>` читается скринридером как текст.

## P3. Даты и валюты форматируются без учёта локали [L5-ux]

- **Где:** `shared/lib/price.ts` (`Intl.NumberFormat("en-EN")` — невалидная локаль), `widgets/billing-invoices-history/billing-invoices-history.tsx:88` (`toLocaleDateString("ru-RU")` для en и uk), `features/current-subscription/current-subscription.tsx:96`.
- **Нужно:** один хелпер на `useFormatter` из next-intl (или `useLocale()` → `en-US` / `uk-UA`).

## P3. Состояния загрузки и анимации [L5-a11y]

- **Где:** `widgets/auth/auth-form-button/auth-form-button.tsx` (нет `disabled`/`isLoading`, на create-account возможна двойная отправка), `shared/ui/loader/loader.tsx` и `Loader2` (нет `role="status"` и текста, при загрузке у кнопки пропадает имя), `globals.css` (нигде нет `prefers-reduced-motion` / `motion-reduce:`).
- **Нужно:** `isLoading`/`disabled` и `aria-busy`, `sr-only` текст у спиннеров, глобальное правило reduced motion. WCAG 2.3.3, 4.1.3.

## P3. Хардкод цветов вместо токенов, мелкий текст, маленькие цели нажатия [L5-ux]

- **Где:** `widgets/auth/*` (`bg-white`, `bg-blue-600`, `text-red-500`, `text-gray-600`, `text-blue-500` с контрастом ≈ 3.7:1; своя кнопка Google вместо `Button variant="outline"`), `todo-item.tsx`, `TodosHead.tsx`, `features/billing-plans/billing-plan.tsx`, `widgets/checkout-form/checkout-form-content.tsx`, `text-[11px]`/`text-[13px]`; `app/not-found.tsx` — классы с опечатками `max-w[500]`, `max-w-[300]`, а «Go home» — ссылка внутри `Button` без `asChild`. Ссылки «Forgot password», «Create account», «Log in» высотой 14px.
- **Нужно:** токены (`bg-card`, `bg-primary`, `text-destructive`, `text-muted-foreground`), компоненты `Button`/`Card`, высота целей не меньше 24px. Skip-link в корневом layout и мобильное меню разделов лендинга. WCAG 1.4.3, 2.4.1, 2.5.8.

Скриншоты: `/private/tmp/claude-501/-Users-irinamysko-projects-human-system-design--claude-worktrees-web-dev-subagents-skills-c7beb0/b6464b93-b411-4988-8467-91401604463b/scratchpad/designer/` (временная папка). **Не проверено:** фокус в диалогах Radix и состояния после входа (только по коду). Один раз `/en/forgot-password` на 768px открылся как create-account; не воспроизвелось, стоит перепроверить.

<!-- L3 -->
## L3. E2E Playwright (`packages/e2e`)

Агент остановлен по запросу пользователя **до финального отчёта**, поэтому итог прогона и список багов от L3 не получены. Что есть в коде:

- `tests/auth.setup.ts` переписан: логин и пароль теперь берутся из `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` (`env.ts`, образец в `packages/e2e/.env.example`), реальный аккаунт убран. Добавлен `packages/e2e/.gitignore` (`playwright/.auth/`, `test-results/`, `playwright-report/`, `.env`). Закоммиченные сессия и трейсы убраны из git. История git их по-прежнему содержит, см. P1 L0: пароль всё равно нужно сменить.
- 58 тестов в 16 файлах. Новые спеки: login, logout, forgot-password, auth-redirect, locale (с входом и без), todos, pricing-checkout, change-password, two-factor, smoke. Проекты конфига: `setup`, `no-auth`, `fresh-user` (сам регистрирует пользователя, `fixtures.ts`), `authenticated`, `Mobile Chrome` (Pixel 5). Новые page objects: header, todos, helpers. `reporter: list + html (open: never)`.
- Добавлены `typecheck` (`tsc --noEmit`) и `@types/node` в `packages/e2e/package.json`. В `pnpm-lock.yaml` это заодно поменяло разрешение `@types/pg` → `@types/node@24`.
- Проверено перед коммитом: `pnpm --filter e2e typecheck` зелёный, `playwright test --list` находит все 58 тестов. **Полный прогон на стеке не проверен**: какие спеки зелёные, а какие стоят как `test.fixme` на баги, нужно выяснить следующим запуском.
- Ограничения стека, которые учтены в хелперах: глобальный throttle 10 запросов в минуту (у всех клиентов за nginx один IP), настоящая reCAPTCHA v3 без тестового режима (ждём `window.grecaptcha`), холодная компиляция в `next dev`.
- **Запуск:** `E2E_USER_EMAIL=… E2E_USER_PASSWORD=… pnpm --filter e2e exec playwright test` (тестовый пользователь, зарегистрированный через `/en/create-account`). Проект `fresh-user` создаёт пользователей `qa-e2e-*@example.test` в БД.

<!-- L4 -->
## L4. Exploratory в браузере

**Пройдено частично.** Посмотрели лендинг, create-account (пустая форма, невалидный email, слабый пароль, двойной клик), регистрацию с автовходом, `/uk/login`, а также API через curl без авторизации. Потом MCP playwright отключился (браузер делили два агента), и остальное не проверено: dashboard, todos (CRUD, XSS), settings, billing, checkout, 2FA, forgot-password, OAuth, IDOR, протухшая сессия, 375px. **Это нужно прогнать повторно.** reCAPTCHA в headless проходит. Двойной клик по submit отправляет один запрос, это корректно. Вживую подтверждены два известных пункта: `verify-email?token=garbage` → `200`, русские тексты в ответах API (`401` на `/api/todos`).

## P2. Регистрация принимает пароль из одного символа [L4]

- **Где:** `apps/web/app/[locale]/(app)/create-account/page.tsx` (форма без zod), api `POST /service-auth/register` (`AccountCreateBodyDto`).
- **Шаги:** `/en/create-account` → имя, валидный email, пароль `1` → Create account.
- **Ожидается:** ошибка валидации (минимальная длина и сложность).
- **Фактически:** `201`, автовход, переход на `/dashboard`.
- **Нужно:** `@MinLength` и правила сложности в DTO, такая же zod-схема в форме (скилл `react-hook-form-zod`).
- **Кому чинить:** backend + frontend.

## P2. Ошибка регистрации не показывается, кнопка навсегда в спиннере [L4, по коду]

- **Где:** `apps/web/app/[locale]/(app)/create-account/page.tsx`, `handleSubmit`.
- **Сейчас:** в `catch` только `console.error`, нет `setIsLoading(false)` и `setError`. Касается дубля email, `403` от капчи и падения `executeRecaptcha`. Текст по умолчанию «Не удалось обновить email» скопирован из другой формы и захардкожен.
- **Нужно:** сбрасывать `isLoading`, показывать локализованную ошибку по коду ответа.
- **Кому чинить:** frontend.

## P2. Swagger и метрики открыты наружу без авторизации [L4]

- **Где:** `apps/api/src/main.ts` (Swagger), `MetricsController`, `nginx.conf`.
- **Фактически:** без авторизации `200` на `/api/docs`, `/api/docs-json` (полная схема API) и `/api/metrics` (маршруты и статусы, Prometheus). В заголовках `X-Powered-By: Express` и `Server: nginx/<версия>`.
- **Нужно:** на проде Swagger выключать по `NODE_ENV` или закрыть basic-auth; `/api/metrics` пускать только из внутренней сети; `app.disable('x-powered-by')`, `server_tokens off`.
- **Уточнение по метрикам:** в `nginx.conf` в репозитории `/api/metrics` уже закрыт (`return 404`), но в запущенном контейнере nginx этого правила нет: `nginx.conf` смонтирован как один файл, а git при обновлении подменил файл новым, и старый контейнер продолжает читать прежний. После `docker compose restart nginx` метрики должны закрыться. Проверить, правильно ли выкатывается конфиг на стенды. Swagger открыт независимо от этого.
- **Кому чинить:** backend + devops.

## P3. `POST /service-auth/validate` на неверный пароль отвечает `201 {}` и не ограничен [L4]

- **Где:** `apps/api/src/modules/auth/auth.controller.ts`, `validate`.
- **Сейчас:** вместо `401` отвечает `201 {}`. В отличие от `login` (`@Throttle` 3/мин), здесь нет ни `@Throttle`, ни `CaptchaGuard`, а через этот эндпоинт идёт весь credentials-вход next-auth. Остаётся только глобальный лимит 10 запросов (`X-RateLimit-Limit: 10`). Это открывает перебор паролей.
- **Нужно:** `401` на неверные данные, отдельный `@Throttle` по IP и email. Проверить вместе с `security`.
- **Кому чинить:** backend.

## P3. Локаль теряется в мелочах [L4]

- `/uk/login`: подзаголовок «Welcome back to your account» на английском.
- reCAPTCHA грузится с `hl=ru` (`recaptcha__ru.js`) при любой локали сайта.
- Нативные HTML5-подсказки валидации показываются на языке браузера, а не интерфейса: лучше `noValidate` + сообщения zod.
- После регистрации `router.push(ROUTE.DASHBOARD)` идёт без локали, отсюда лишний `307`.
- В консоли предупреждение про отсутствующий `autocomplete` у полей пароля.
- **Кому чинить:** frontend.

### L4, второй проход

Прогон шёл headless-скриптами Playwright, без MCP-браузера. Пройдены dashboard, todos, settings, billing, pricing, checkout (до формы оплаты), thank-you-payment, billing/cancel, forgot-password, `/test`, OAuth, протухшая сессия, 375px, консоль и сеть, en/uk. **Не проверено:** загрузка картинок (S3), 2FA и телефон (без реальных SMS), карты, подписки и инвойсы с данными (без оплаты их не создать), подтверждение email, форматы дат (на тестовых данных дат нет).

Вживую подтверждены: C4 (`DELETE /todos/:id` → 403 для USER), forgot-password без сетевого запроса, `/test` открывается без входа, Swagger открыт наружу. **C3 на dev не воспроизвёлся** (PATCH с `todoId` → 200). Это согласуется с пунктом L2 «на dev-стеке ValidationPipe не валидирует»: на проде после tsc ответ будет 400.

## P1. Список todo в браузере никогда не загружается: клиентский fetch идёт на внутренний docker-хост [L4]

- **Где:** `apps/web/app/[locale]/(app)/todos/todos.tsx` (`fetchTodos`), `apps/web/api.ts` (`API_URL.todos.list` строится от `NEXT_PUBLIC_API_SERVER_URL=http://api:3001`).
- **Шаги:** войти → `/en/todos` → создать задачу.
- **Ожидается:** задача появляется в списке.
- **Фактически:** браузер запрашивает `GET http://api:3001/todos?...` и получает `net::ERR_NAME_NOT_RESOLVED` (`TypeError: Failed to fetch`). Список всегда пустой («Задач пока нет»), хотя `POST /api/todos` возвращает 201 и задачи лежат в БД. Если подменить URL на `/api/todos`, список появляется.
- **Нужно:** в клиентских компонентах использовать `NEXT_PUBLIC_API_CLIENT_URL` (разделить в `api.ts` серверный и клиентский варианты); проверить остальные клиентские вызовы `API_URL`.
- **Доказательство:** `scratchpad/exploratory/t1-after-create.png`.
- **Кому чинить:** frontend.

## P2. Todos: после создания список не обновляется; длинные и пустые заголовки [L4]

- `todos.tsx` не передаёт `onTodoCreated` в `<CreateTodoForm />`: даже после фикса P1 новая задача появится только после перезагрузки.
- `POST /api/todos` принимает title из одних пробелов и из 100 000 символов (оба 201). В списке получается пустая карточка или карточка без видимой кнопки удаления: длинное слово не переносится.
- Если сессия протухла, создание задачи показывает `window.alert("Ошибка при создании задачи")` по-русски вместо редиректа на login.
- **Кому чинить:** frontend + backend (`@IsNotEmpty`, `trim`, `MaxLength`).

## P2. Login с неверным паролем: вечный спиннер [L4, подтверждение L1/L2]

- **Шаги:** `/uk/login` → свой email и неверный пароль → «Увійти».
- **Фактически:** `POST /api/service-auth/login` → `201` с пустым телом, клиент падает на `response.json()` (`SyntaxError: Unexpected end of JSON input`), спиннер не гаснет, ошибка не показывается.
- **Кому чинить:** backend (401, см. L2) + frontend (см. L1-web).

## P2. Смена email без подтверждения и без пароля, сессия хранит старый email [L4, подтверждение L5-security]

- Email меняется сразу (`200 {}`), вход работает уже по новому адресу. `/api/auth/session` показывает старый email, а settings после перезагрузки — новый.
- Email при входе чувствителен к регистру: `QA-…@Example.Test` не логинится, если адрес хранится в нижнем регистре.
- **Нужно:** см. L5-security; плюс нормализовать email (`toLowerCase().trim()`) при регистрации, входе и смене; обновлять JWT после смены.
- **Кому чинить:** backend + frontend.

## P2. Пароль без верхней границы: bcrypt обрезает его до 72 байт [L4]

- **Шаги:** сменить пароль на строку из 5000 символов (успех). Затем ввести в «текущий пароль» те же первые 72 символа с другим хвостом — проверка тоже проходит.
- **Нужно:** `MaxLength(72)` (в байтах) на регистрации и смене пароля, или pre-hash перед bcrypt.
- **Кому чинить:** backend.

## P2. Сервер отвечает 500 там, где должен быть 4xx [L4]

- `GET /api/todos?sortBy=password&sortOrder=drop` → `500` (на dev не работает валидация `@IsIn`, см. L2).
- `POST /api/billing/subscriptions/renew` без подписки → `500`.
- `POST /api/billing/subscriptions/upgrade` с несуществующим `priceId` → `500`.
- `POST /api/billing/checkout` с `{}` → `201` с пустым телом.
- **Нужно:** единый exception filter и 400/404 вместо 500.
- **Кому чинить:** backend.

## P2. Кабинет на 375px непригоден (подтверждение L5-a11y) [L4]

- Sidebar шириной 160px не сворачивается. На todos форма сжимается до 135px, карточки pricing уходят за край, шапка с именем и выбором языка обрезана. Скриншоты: `scratchpad/exploratory/m-_en_todos.png`, `m-_en_pricing.png`, `m-_en_settings.png`.
- **Кому чинить:** frontend.

## P3. Прочее из второго прохода [L4]

- **Back после выхода** показывает `/uk/settings` из кэша с email и полями, хотя сессии уже нет. Нужен `Cache-Control: no-store` для защищённых страниц.
- **Русский и английский вперемешку** (дополнение к пункту про i18n): `billing/cancel` целиком на русском и без sidebar; тосты settings («Email успешно изменен», «Неверно указан текущий пароль», «Этот email адрес уже используется в системе»); в uk на английском «Two-factor authentication», подписи функций на pricing («Basic tools», «Priority support»), вся страница forgot-password; сортировка «Latest» / «Спочатку нові».
- **Stripe:** в ответах внутренние сообщения (`No such payment_intent`, `Stripe Detach Error: …`), `GET /api/billing/user` отдаёт `stripeCustomerId`.
- **Checkout:** email и `priceId` в query URL (PII попадает в историю и логи); заход без параметров идёт цепочкой из трёх 307 через `/` и `/dashboard` без локали; двойной клик по Upgrade даёт две навигации.
- **OAuth:** Google ведёт на `accounts.google.com/signin/oauth/error` (`invalid_request`: клиент не настроен для `http://myapp.local`), GitHub работает. Forgot-password открывается вошедшему пользователю (login и create-account его редиректят).
- **Кому чинить:** frontend, backend, devops (OAuth-клиент).

**Тестовые данные, оставшиеся в БД после L4** (удалить вручную): пользователи `qa-explore-1763668900-chg@example.test` (основной, email сменён в тесте), `qa-explore-weak@example.test` и, возможно, ещё один от попытки с невалидным email; 3 todo основного пользователя (через UI их не удалить, DELETE разрешён только ADMIN); тестовый Stripe customer `cus_…` основного пользователя.

<!-- L1-API -->
## L1. Unit, `apps/api`

**Итог:** было 3 spec-файла / 17 тестов, стало 22 / 161 (160 passed, 1 `it.todo`). Из прошедших 11 — `it.failing`, они фиксируют баги. Когда баг починят, такой тест упадёт с «expected to fail», и `.failing` нужно снять. Покрытие без `src/prisma/generated`: 23% statements, 29% branches (с ним 4.7%). Ключевые файлы покрыты на 85–100%: `auth.service`, guards, `captcha`, `user.service`, `twilio`, `emails.controller`, webhooks, `subscription.service`, `todo.service`, `storage`. Тесты подтвердили известные пункты про `verify-email`, обход SMS, тестовое письмо в `getUserProfile` и заглушки вебхуков; в тестах на них стоят ссылки на эти пункты.

## P2. `login()` отклоняет любого пользователя с именем [L1]

- **Где:** `apps/api/src/modules/auth/auth.service.ts`, `login`: `if (!user?.profile?.phone || user?.profile?.name) return { error }`.
- **Сейчас:** условие перевёрнуто: пользователь с `profile.name` получает «Invalid email or password». Пользователь без телефона тоже: `createUser` пишет `phone: ''`. Ветки входа с 2FA и без неё для реальных пользователей недостижимы. Соседний `validate()` проверяет `!name` правильно.
- **Нужно:** `!user?.profile?.name`, телефон проверять только в ветке 2FA. Сначала выяснить, какой эндпоинт реально вызывает web (`login` или `validate`).
- **Тест:** `auth.service.spec.ts`, два `it.failing` в `login`.
- **Кому чинить:** backend.

## P2. `createUser` не сохраняет `verifiedToken` [L1]

- **Где:** `apps/api/src/modules/user/user.repository.ts`, `createUser`.
- **Сейчас:** `AuthService.createAccount` генерирует токен, а репозиторий пишет `verifiedToken: null` и игнорирует `data.isVerified`. Даже после починки `verify-email` сверять токен будет не с чем.
- **Нужно:** сохранять `data.verifiedToken` и `data.isVerified`, добавить срок действия токена. Чинить вместе с P1 `verify-email`.
- **Тест:** `user.repository.spec.ts`, `it.failing` «persists the verification token passed by AuthService».
- **Кому чинить:** backend.

## P2. `setTwoFactor` глотает ошибки, а контроллер ничего не возвращает [L1]

- **Где:** `apps/api/src/modules/user/user.service.ts` `setTwoFactor`; `users.controller.ts` `setTwoFactor`.
- **Сейчас:** `BadRequestException('Invalid code')` бросается внутри `try` и тут же ловится, результат превращается в `{ success: false }`. Сбой БД скрывается так же. Контроллер делает `await` без `return`, поэтому клиент всегда получает `200` с пустым телом. UI не может отличить успех от ошибки.
- **Нужно:** убрать общий `try/catch` (неверный код → 400), возвращать результат сервиса из контроллера.
- **Тест:** `user.service.spec.ts` (2 × `it.failing`), `users.controller.spec.ts` (1 × `it.failing`).
- **Кому чинить:** backend, затем frontend (`two-factor-form`).

## P2. `deleteTodo` на чужую или несуществующую задачу отвечает 500 [L1]

- **Где:** `apps/api/src/modules/todo/todo.service.ts` и `todo.repository.ts`, `deleteTodo`.
- **Сейчас:** `prisma.todo.delete({ where: { id, userId } })` бросает `P2025`. Сервис эту ошибку не мапит, глобального exception filter нет (`APP_FILTER`/`useGlobalFilters` не найдены). Чужую задачу удалить нельзя, так что это не IDOR, но код ответа неверный: `updateTodo` в той же ситуации отвечает 404/403.
- **Нужно:** ловить `P2025` → `NotFoundException` или `deleteMany` с проверкой `count`. Лучше подумать о глобальном фильтре Prisma-ошибок.
- **Тест:** `todo.service.spec.ts`, `it.failing` (код 500 выведен по коду, подтвердить на L2).
- **Кому чинить:** backend.

## P3. Конфиг jest в api не знает про baseUrl-алиасы [L1]

- **Где:** `apps/api/package.json`, секция `jest`.
- **Сейчас:** нет `modulePaths`/`moduleNameMapper` для bare-импортов (`modules/...`, `prisma/...`, `config/...`), поэтому в трёх spec они замоканы через `jest.mock(..., { virtual: true })`. ESM-модуль `@auth/core/jwt` приходится мокать в каждом тесте, который подключает `jwt-auth.guard`. `collectCoverageFrom` включает `src/prisma/generated`, и общий процент покрытия из-за этого занижен.
- **Нужно:** `"modulePaths": ["<rootDir>"]`, `transformIgnorePatterns` для `@auth/core`, исключить `prisma/generated` из coverage. После этого убрать виртуальные моки.
- **Кому чинить:** backend.

**Наблюдения без теста:** `PaymentProcessor` не идемпотентен: при повторной доставке события создаст вторую фичу и второй инвойс (входит в пункт про вебхуки, в `payment.handler.spec.ts` оставлен `it.todo`). `AuthGuard.canActivate` пишет полный объект ошибки в `console.error` на каждый невалидный токен. `updateEmail` не сбрасывает `isVerified` и не запрашивает пароль, это решение за продуктом. **Не покрыто:** репозитории (нужна БД), контроллеры (это L2), `finance`/`payment-method`/`invoice`/`product`/`payments.service`, `stripe.provider` (следующий приоритет: гонка в `invoice.service.generateUniqueInvoiceNumber`, проверка подписи), RabbitMQ, pdf, metrics, `email.service`.

<!-- L1-WEB -->
## L1. Unit, `apps/web`

**Итог:** было 1 файл / 2 теста, стало 13 / 111 (91 passed + 20 `it.fails` на баги). Покрытие statements выросло с 0.3% до 19.2%, branches с 0% до 18.8%. Покрыты `api.ts`, `shared/lib`, guards, `proxy.ts`, `auth.config.ts`, `utils.ts`, формы change-email, change-password, two-factor, add-card и login-страница. В devDependencies нет `@testing-library/user-event`, поэтому в тестах форм стоит заглушка на `fireEvent`; нужно `pnpm --filter web add -D @testing-library/user-event` (frontend).

## P1. Вход с 2FA обходится: неверный OTP не останавливает `signIn`, а `validate` 2FA не проверяет [L1]

- **Где:** `apps/web/app/[locale]/(app)/login/page.tsx`, `checkCode` и `onVerify`; `apps/api/src/modules/auth/auth.service.ts`, `validate` (его вызывает `authorize` в `apps/web/auth.ts`).
- **Сейчас:** `checkCode` ловит ошибку «неверный код» и только пишет `console.error`. Потом `onVerify` всё равно вызывает `signIn("credentials")`. `validate` проверяет только email и пароль. В итоге пользователь с `twoFactorEnabled` входит без кода, по одному паролю.
- **Нужно:** на сервере выдавать сессию пользователю с 2FA только после подтверждённого OTP (например, одноразовый токен из `verify-code`, который проверяет `validate`). На клиенте при ошибке показывать сообщение и не вызывать `signIn`. Затрагивает auth, после исправления нужен `security`.
- **Тест:** `login-page.test.tsx`, «неверный OTP: показывается ошибка и signIn не вызывается». Серверная часть подтверждена чтением кода.
- **Кому чинить:** backend + frontend.

## P2. Login: после OTP `signIn` вызывается дважды, а ошибки API и reCAPTCHA глотаются [L1]

- **Где:** `login/page.tsx`: `checkCode` и `onVerify` оба вызывают `login()`; `handleSubmitAuthForm`.
- **Сейчас:** два `signIn`, `router.push` и `amplitude.track` на один вход. `401` и отказ reCAPTCHA попадают в `catch` с одним `console.error`, `isLoading` остаётся `true`, и форма зависает без сообщения. На create-account та же проблема (см. L4).
- **Нужно:** один вызов `login()`; в `catch` — `setError` (через i18n) и `setIsLoading(false)`.
- **Тест:** `login-page.test.tsx` (3 × `it.fails`).
- **Кому чинить:** frontend.

## P2. 2FA-форма: неверный код считается успехом, `loading` зависает [L1]

- **Где:** `apps/web/features/two-factor-form/use-two-factor-form.ts`: `handleEnterCode`, `handleSwitchEnabled`, `sendSmsCode`.
- **Сейчас:** `response.ok` не проверяется, и после отказа сервера UI показывает 2FA включённой. Новое значение считается из устаревшего пропа `!userTwoFactorEnabled`. Если SMS не ушла, `loading` не сбрасывается, и Switch пропадает до перезагрузки. `executeRecaptcha` вызывается вне `try`. Вместе с L1-api `setTwoFactor` (всегда `200`) получается, что UI и сервер оба врут.
- **Нужно:** проверять `ok`, при ошибке оставаться на шаге `otp`; `finally { setLoading(false) }`; reCAPTCHA обернуть в `try`; брать текущее значение `enabled` из состояния.
- **Тест:** `use-two-factor-form.test.ts` (3 × `it.fails`).
- **Кому чинить:** frontend (после backend-фикса `setTwoFactor`).

## P2. AddCardForm: кнопка навсегда блокируется, если нет `CardNumberElement` [L1]

- **Где:** `apps/web/features/add-card-form/add-card-form.tsx`, `handleSubmit`.
- **Сейчас:** `setIsProcessing(true)` стоит до `if (!cardNumberElement) return;` и не сбрасывается. `onSuccess()` вызывается без `await`, его reject никто не обрабатывает.
- **Нужно:** сначала проверка, потом `setIsProcessing`, либо сброс в `finally`; `await onSuccess()`.
- **Тест:** `add-card-form.test.tsx`.
- **Кому чинить:** frontend.

## P2. Защита маршрутов: три разных списка и три разные логики [L1]

- **Где:** `apps/web/proxy.ts` (`includes`, точное совпадение), `apps/web/auth.config.ts` (`authorized` знает только `/dashboard` и `/todos`), `apps/web/shared/utils/guards.ts` (`startsWith`), `constants/routes.ts`, `shared/lib/normalize-path.ts`.
- **Сейчас:** гость проходит на вложенные пути вроде `/settings/security`. `authorized` не знает про `/settings`, `/billing`, `/pricing`. `/pricing-x` считается защищённым. `normalizePath` отрезает первый сегмент без проверки, локаль ли это (`/login` превращается в `/`).
- **Нужно:** одна функция с сегментным сравнением (`path === r || path.startsWith(r + "/")`) для `proxy`, `authorized` и guards; локали брать из `@repo/i18n`. Убедиться, что серверные страницы под `(app)` сами проверяют сессию.
- **Тест:** `proxy.test.ts`, `auth.config.test.ts`, `guards.test.ts`, `lib.test.ts`.
- **Кому чинить:** frontend.

## P2. `apps/web/api.ts`: пути `emails` не совпадают с api [L1]

- **Где:** `apps/web/api.ts`, `emails.sendVerification` и `emails.verifyEmail` (`/emails/...`), а в api контроллер `@Controller('sender/emails')`.
- **Сейчас:** пока эти URL нигде не используются, но при подключении дадут 404.
- **Нужно:** `/sender/emails/...` или удалить мёртвые функции.
- **Тест:** `api.test.ts`.
- **Кому чинить:** frontend.

## P3. Мелочи в `apps/web` [L1]

- `api.ts`: параметры `todos.list(sortBy, sortOrder)` и `*ById(id)` не кодируются (`a&b` ломает query, `../x` меняет путь). Нужен `encodeURIComponent` или `URLSearchParams`.
- `shared/lib/zod.ts`, `signInSchema`: тексты ошибок не совпадают с границами (`min(8)` и «must be more than 8»), тексты на английском, схема нигде не используется. Удалить или привести в порядок.
- `utils.ts`, `syncBillingProducts`: в `catch` нет `return`, поэтому при сетевой ошибке возвращается `undefined`, а не `[]`.
- Захардкоженные тексты подтверждены тестами (`it.fails` «тексты toast идут через i18n») в change-email, change-password, add-card. Добавить в пункт про i18n: `login/page.tsx`, `create-account/page.tsx`.
- **Кому чинить:** frontend.

**Не покрыто (web):** `auth.ts` (callbacks next-auth, следующий приоритет), create-account, settings, billing, `checkout-form-content`, subscription-cancel/renew, upgrade-button, billing-plans, current-subscription, oauth-connections, language-settings; презентационные `components/ui`, landing, sidebar, header (лучше e2e).

<!-- L5-SECURITY -->
## L5. Безопасность (`security`, чтение кода, без эксплойтов)

**Вердикт: есть уязвимости.** Что в порядке: raw SQL нет, `orderBy` в todo ограничен `@IsIn`, IDOR в todo закрыт условием по `userId`, подпись вебхука Stripe проверяется по raw body, `ValidationPipe` включён с `whitelist` и `forbidNonWhitelisted`, CORS ограничен `CLIENT_URL`, open redirect не найден, ключей Stripe, AWS, SendGrid, Twilio в репозитории нет.

## P1. 2FA обходится: сессия выдаётся по одному паролю — подтверждение и дополнение к L1-web [L5-security]

Подтверждено независимо. Дополнения к пункту L1-web:
- `POST /api/service-auth/validate` открыт наружу через nginx (`location /api/`). На нём нет ни `CaptchaGuard`, ни своего `@Throttle`, поэтому он служит оракулом для подбора паролей.
- Атака: `POST /api/auth/callback/credentials` с `csrfToken`, email и паролем возвращает рабочий session-token без SMS-кода. Так происходит и при `PAID_API=enabled`.
- **Нужно:** `verify-otp` выдаёт одноразовый `loginTicket` (Redis, TTL около 5 минут). `authorize` для пользователя с `twoFactorEnabled` требует этот ticket. `validate` сделать внутренним: убрать из nginx или закрыть общим секретом в заголовке, добавить капчу и throttle. Добавить тест «пользователь с 2FA без кода сессию не получает».
- **Кому чинить:** backend, frontend, devops.

## P1. `next@16.2.7`: RCE в Image Optimizer реально эксплуатируем [L5-security]

- **Где:** `apps/web/package.json`, `apps/web/next.config.js` (`images.remotePatterns`: `lh3.googleusercontent.com`, `avatars.githubusercontent.com`), `features/auth-buttons.tsx` (`next/image`).
- **Риск:** `/_next/image` включён, а разрешённые хосты отдают контент, который загружают пользователи. Неаутентифицированный запрос с AVIF или SVG может дать RCE в web-контейнере. Там лежит `NEXTAUTH_SECRET`, а с ним можно подделать сессию любого пользователя, в том числе ADMIN. Server Action (`shared/utils/auth.ts`) делает актуальным и SSRF.
- **Нужно:** обновить `next` до версии не ниже 16.4.1. До выката поставить `images.unoptimized: true` или сузить `remotePatterns`.
- **Кому чинить:** frontend, devops.

## P2. Rate limit общий на весь сайт: все клиенты для API — один IP nginx [L5-security]

- **Где:** `apps/api/src/main.ts` (нет `trust proxy`), `nginx.conf` (нет `X-Forwarded-For`), глобальный `ThrottlerGuard` в `app.module.ts` (10 запросов в минуту).
- **Риск:** анонимный клиент 3–10 запросами в минуту на login блокирует вход всем пользователям (429). Обычный SSR тоже упирается в лимит. Вебхуки Stripe получают 429: на них нет `@SkipThrottle`. При этом лимита на одного атакующего нет.
- **Нужно:** `proxy_set_header X-Forwarded-For` / `X-Real-IP`; `trust proxy` только для подсети прокси, после обновления `proxy-addr`; лимиты по email и аккаунту на login, validate, verify-otp, sms; `@SkipThrottle()` на вебхук; IP клиента из SSR передавать доверенным заголовком.
- **Кому чинить:** devops, backend.

## P2. IDOR в биллинге: удаление чужой карты и чтение чужого PaymentIntent [L5-security]

- **Где:** `billing/payment-method/payment-method.service.ts` `deletePaymentMethod` (+ `stripe.provider.ts`: `_stripeCustomerId` не используется); `billing/finance/finance.controller.ts` / `finance.service.ts` `getPaymentIntent`.
- **Сейчас:** `paymentMethods.detach(id)` вызывается без проверки, что `pm.customer` — текущий пользователь. `GET billing/payment-intents/:id` возвращает сумму, `customer` и `metadata` любого PI. id PI лежит в URL `thank-you-payment` и оттуда уходит в Referer, Amplitude, GrowthBook и логи.
- **Нужно:** `retrieve` и сверка `customer === stripeCustomerId` пользователя, иначе 404. Та же проверка в `addPaymentMethod` и `updateDefaultPaymentMethod`.
- **Кому чинить:** backend.

## P2. `priceId` в checkout и upgrade берётся от клиента без allowlist [L5-security]

- **Где:** `finance.service.ts` (`createCheckout`, `createSubscription`, `createPaymentIntent`), `subscription.service.ts` `upgradeSubscription`.
- **Риск:** можно купить по архивной, тестовой или нулевой цене. Не проверяются `active` и `type`, валюта всегда `usd`, а сумма берётся из `unit_amount`.
- **Нужно:** проверять `priceId` по таблице `Product` (`isActive`), сверять `price.active`, `price.type` с `dto.type`, валюту брать из `price.currency`.
- **Кому чинить:** backend.

## P2. Загрузка файлов в todos без лимитов, тип определяется по Content-Type клиента [L5-security]

- **Где:** `apps/api/src/modules/todo/todos.controller.ts`, `createTodo` и `uploadTodoImage` (`FileInterceptor('file')` без `limits`).
- **Риск:** любой зарегистрированный пользователь кладёт API по OOM файлом на несколько ГБ (memoryStorage). В `createTodo` размер не проверяется вовсе. В S3 можно загрузить произвольные байты под видом `image/png`. Файл уходит в S3 раньше проверки владельца.
- **Нужно:** `limits: { fileSize: 5 MB, files: 1 }` и `fileFilter`, проверка magic bytes (`file-type`), сначала владелец, потом загрузка, обновить multer.
- **Кому чинить:** backend.

## P2. Захват аккаунта: email меняется без пароля, сессии не отзываются, 2FA выключается кодом на любой номер [L5-security]

- **Где:** `user/user.service.ts` (`updateEmail`, `updatePassword`, `setTwoFactor`), `user-set-two-factor.body.dto.ts`, `apps/web/auth.ts` (JWT `maxAge` 30 дней).
- **Сейчас:** `PATCH user/profile` меняет email без текущего пароля и подтверждения, `isVerified` не сбрасывается. После смены пароля старые сессии живут до 30 дней, роль зашита в токен на тот же срок. `setTwoFactor` проверяет код для `dto.phone` из тела запроса, а не для номера из профиля, и `POST sender/sms/send` отправит код на любой номер.
- **Риск:** с украденной один раз сессией атакующий меняет email на свой и выключает 2FA (или включает её на свой номер). Смена пароля жертвой его не выкидывает.
- **Нужно:** для смены email — пароль, подтверждение на новый адрес и уведомление на старый. `tokenVersion` в `User`: увеличивать при смене пароля и email, проверять в `AuthGuard`. Короче `maxAge`. Для 2FA — код на номер из БД плюс пароль; SMS для настроек только под `AuthGuard` на номер из профиля.
- **Кому чинить:** backend, frontend.

## P2. SMS pumping через публичный `POST sender/sms/send` [L5-security]

- **Где:** `apps/api/src/modules/sender/sms/sms.controller.ts`.
- **Риск:** без `AuthGuard`, номер берётся из тела, защита — только reCAPTCHA v3 и общий throttle. При `PAID_API=enabled` бот шлёт коды на премиальные номера за ваш счёт в Twilio.
- **Нужно:** SMS для логина отправлять только из `login()` после проверки пароля, для настроек — под `AuthGuard` на номер из профиля. Лимиты на номер и пользователя, гео-allowlist и Fraud Guard в Twilio.
- **Кому чинить:** backend, devops.

## P2. Нет security-заголовков (CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy) [L5-security]

- **Где:** `apps/api/src/main.ts` (нет `helmet`), `apps/web/next.config.js` (нет `headers()`), `nginx.conf` (нет `add_header`, только HTTP).
- **Риск:** кликджекинг на `/settings` (выключить 2FA, удалить карту), утечка id PI через Referer, никакой защиты на случай XSS.
- **Нужно:** `helmet()` в Nest; в Next CSP с учётом Stripe, reCAPTCHA, Turnstile, Amplitude, GrowthBook, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `nosniff`; HSTS и TLS на ingress.
- **Кому чинить:** backend, frontend, devops.

## P2. Docker-образ содержит e2e-сессии и трейсы (при локальной сборке ещё и `.env`), образ пушится даже при упавшем CI [L5-security]

- **Где:** `.dockerignore` (шаблоны работают только от корня), `Dockerfile` (финальный этап копирует всё дерево вместе с dev-`node_modules`), `.github/workflows/docker.yml` (`workflow_run` без проверки `conclusion == 'success'` и ветки).
- **Риск:** любой, кто может сделать `docker pull` из GHCR, получает session-token и, возможно, пароль из трейсов.
- **Нужно:** в `.dockerignore` — `**/.env*`, `!**/.env.example`, `**/test-results`, `**/playwright-report`, `**/playwright/.auth`, `**/node_modules`. В финальный этап копировать только `dist`, prod-зависимости и prisma. В `docker.yml` проверять успех CI и `head_branch == main`. После чистки git (L0) пересобрать образы и удалить старые теги.
- **Кому чинить:** devops.

## P2 (латентно). `POST sender/emails/send-verification` публичный и принимает токен из тела [L5-security]

- **Где:** `sender/email/emails.controller.ts`, `email.processor.tsx`.
- **Риск:** когда включат очередь, анонимный клиент сможет слать письма с вашего домена на любые адреса, а через `token` дописывать параметры в ссылку.
- **Нужно:** токен генерировать на сервере, повторную отправку делать под `AuthGuard` с лимитом, `encodeURIComponent`. Чинить вместе с P1 `verify-email`.
- **Кому чинить:** backend.

## P3. Прочее по безопасности [L5-security]

- **`verifiedToken` в ответе профиля:** `user-get-profile.response.dto.ts` (`@Expose`). Когда verify-email починят, почту можно будет подтвердить без доступа к ящику. Убрать из DTO, хранить хеш токена (см. L1-api `createUser`).
- **Перечисление пользователей и слабая валидация:** регистрация отвечает «уже существует», смена email — 409; в DTO нет `MinLength(8)`/`MaxLength(72)` для паролей, `@IsEmail` в `AccountValidateBodyDto`, `MaxLength` у `title` (см. L4).
- **Ошибки Stripe уходят клиенту** (`payment-method.service.ts`, `webhook.service.ts`, `finance.service.ts`): нужен единый exception filter.
- **Персональные данные в логах и у третьих сторон:** `console.log` профиля в `settings/page.tsx:15`, биллинга в `pricing/page.tsx`, `billing/page.tsx`; полное письмо в логе `email.consumer.ts:43`; email и полный URL уходят в GrowthBook (`growth-book-provider.tsx`).
- **Побочные эффекты на GET:** `GET billing/products/sync` доступен любому пользователю без `@Roles('ADMIN')`; SSR `checkout/page.tsx` на GET создаёт подписку или PI в Stripe (CSRF через ссылку с top-level GET).
- **Конфиг не валидируется:** `config/validation.ts` не подключён к `ConfigModule.forRoot`; Swagger зависит только от `NODE_ENV`; fallback-креды RabbitMQ в `app.module.ts:88`.
- **Капча:** не сверяются `action` и `hostname` (`captcha.service.ts`); на OTP-шаге UI рендерит Turnstile, а сервер проверяет reCAPTCHA.
- **CI/CD:** `mikefarah/yq@master` в `helm.yml` выполняется с `GITOPS_TOKEN` (нужен пиннинг по SHA и `persist-credentials: false`); у `release.yml` лишние права, и он собирает несуществующие `apps/*/Dockerfile`; `security.yml` гоняет `npm audit || true` с плейсхолдерами образов; `nightly.yml` сканирует `docker.io/library/api:latest` с `exit-code: 0`.
- **docker-compose и helm:** RabbitMQ (5672, 15672, 15692) и pgAdmin слушают все интерфейсы с дефолтными кредами; `label-backup` с `docker.sock`; в helm пустой `securityContext`, `automount: true`, нет TLS. Файлы `infra/helm/secrets/*` в git пустые, утечки нет.
- **Cookie и OAuth:** домен `.myapp.local` зашит в `apps/web/auth.ts`. OAuth-сессии получают случайный `user.id` без пользователя в БД (поток не работает). Если «починить» его привязкой по email без `email_verified`, получится захват аккаунтов.
- **Кому чинить:** backend, frontend, devops.

**Проверить:** публичен ли S3-бакет (web показывает прямые URL объектов, лучше приватный бакет и presigned GET); идемпотентность вебхуков после включения очереди (дубли инвойсов и фич; PI от счетов подписки попадут в `handleSubscriptionUpgrade`, который не обновляет items в Stripe); откуда тянутся `axios`/`form-data`/`follow-redirects` (`pnpm why`).

### Зависимости: что реально эксплуатируемо (уточнение к P1 L0)

| Пакет | Эксплуатируемо? |
|---|---|
| `next` Image Optimizer (RCE), SSRF в Server Actions, DoS App Router | **Да** |
| `next` `next/og`, `use cache`, Windows RCE | Нет: не используются |
| `next-auth` / `@auth/core`: fail-open, исключение в `getToken()` (DoS `proxy.ts`) | Да, обновить |
| `next-auth`: homoglyph в email | Нет: нет Email-провайдера |
| `multer`, `body-parser`, `qs`, `path-to-regexp` (DoS) | **Да**, в том числе без аутентификации |
| `@sentry/nextjs` (корень), `ejs` (через `bull-board`), `joi` | Нет: не используются, удалить |
| `proxy-addr` | Станет актуален, когда добавят `trust proxy` |
| `sharp` | Да, через Image Optimizer; закрывается обновлением `next` |
| остальное (`ws`, `socket.io`, `postcss`, `vite`, …) | Низкий риск |

**Порядок обновлений:** 1) `next` ≥ 16.4.1; 2) `next-auth` ≥ 5.0.0-beta.32 и `@auth/core` ≥ 0.41.3 в api, в одном PR (формат JWE должен совпадать); 3) `@nestjs/platform-express`, `@nestjs/core` на свежие 11.x и лимиты multer; 4) удалить `@sentry/nextjs` из корня, `bull-board`, `bull`, `@bull-board/*`; 5) остальное через `pnpm update`, вернуть `pnpm audit --prod --audit-level=high` в CI.

<!-- L2 -->
## L2. Интеграция и контракт API

**Итог:** создан `apps/api/test/` (`jest-e2e.json`, helpers, 7 spec-файлов), 232 теста: 194 в Nest testing module (настоящий `AuthGuard` с подписанной cookie Auth.js, моки Prisma, Stripe, S3, Twilio) и 38 black-box против стека. 28 тестов помечены `it.failing`; для каждого проверено, что без `.failing` он падает именно из-за бага. Запуск: `pnpm --filter api test:e2e` (black-box пропускается); `API_E2E_URL=http://myapp.local/api pnpm --filter api test:e2e` — со стеком (около 3,5 минуты: каждый запрос к `myapp.local` идёт около 5 секунд, похоже на откат IPv6 → IPv4). Проверено: 401 на всех 21 защищённом маршруте, в том числе с подделанной cookie; валидация DTO и границы; IDOR; двойные и параллельные запросы; загрузка файлов; подписи вебхука Stripe (настоящие, через `generateTestHeaderString`); 429 с 4-го запроса на login, verify-otp, sms; CORS. Регистрация на живом стеке закрыта reCAPTCHA, поэтому сценарии с входом шли только через testing module. Пользователей в БД L2 не создавал.

Тестами L2 **подтверждены** уже записанные пункты: обход 2FA через `validate` (P1), IDOR карты и PaymentIntent, `verifiedToken` в профиле, публичный `send-verification`, загрузка файлов (плюс: регулярка `/\/(jpg|jpeg|png|webp)$/` пропускает `text/png`), отсутствие лимитов длины строк (плюс: `@Length(6)` для OTP без max), `products/sync` без роли, ошибки Stripe в ответе, `verify-email`, тестовое письмо в `getUserProfile`, неидемпотентный вебхук, `setTwoFactor` → `201` с пустым телом.

## P2. На dev-стеке ValidationPipe не валидирует ничего [L2]

- **Где:** `docker-compose.yml` (api запускается `pnpm run start:dev` → `tsx watch src/main.ts`), `apps/api/src/main.ts`.
- **Сейчас:** tsx (esbuild) не эмитит `design:paramtypes`, у `@Body()` нет metatype, и `ValidationPipe` молча пропускает всё: и whitelist, и типы. Живой `POST /api/service-auth/validate {"email":1}` возвращает `201`, а в testing module тот же запрос даёт `400`. Прод (`node dist/main.js` после tsc) работает правильно, то есть dev и прод ведут себя по-разному. Из-за этого на dev не видно ошибок контракта C2 и C3 (ниже). Причина выведена косвенно: отдельный запуск под tsx не проверялся.
- **Нужно:** запускать dev через компилятор с метаданными декораторов (`nest start --watch` или swc с `decoratorMetadata`).
- **Кому чинить:** devops + backend.

## P2. Глобальный `ClassSerializerInterceptor(excludeAll)` отдаёт `{}` там, где нет `@Serialize` [L2]

- **Где:** `apps/api/src/main.ts`; без `@Serialize`: `app.controller.ts` (`/health`), `todos.controller.ts` (`upload-image`), `products.controller.ts` (`sync`), `finance.controller.ts` (webhook), `emails.controller.ts` (`verify-email`). Отдельно: DTO `UserUpdateEmailResponseDto` и `UserUpdatePasswordResponseDto` размечены `@IsBoolean` вместо `@Expose`; у вложенного `Metadata` в `payment-intent-get.response.dto.ts` нет `@Expose`.
- **Сейчас:** живой `GET /api/health` возвращает `200 {}` вместо `{status, redis}`, так что health-check ничего не проверяет. `upload-image` не отдаёт `imageUrl`, и web показывает «Ссылка: undefined». `metadata.name` и `metadata.type` теряются, `thank-you-payment` не получает название товара.
- **Нужно:** response-DTO с `@Expose` для каждого эндпоинта или отказ от `excludeAll`.
- **Кому чинить:** backend.

## P2. Неверные учётные данные дают 2xx с пустым телом вместо 401/409 [L2, L4]

- **Где:** `auth.service.ts` (`login`, `validate`, `createAccount`), DTO ответов в `modules/auth/dto/response`.
- **Сейчас:** неверный пароль в `validate` → `201 {}`. В `login` объект `{error}` вырезается сериализатором, тело ответа пустое, web падает на `response.json()` и молча глотает ошибку. Повторная регистрация с тем же email → `201 {error: '…'}`.
- **Нужно:** `UnauthorizedException` / `ConflictException` в едином формате `{statusCode, message, error}` и коды ошибок для i18n на web. Пункт L4 про `validate` (P3) поднят до P2 этим.
- **Кому чинить:** backend, затем frontend.

## Контракт web ↔ api [L2]

Источник: `/api/docs-json` (31 операция) и метаданные контроллеров, проверка в `contract.e2e-spec.ts`. Остальные URL из `api.ts` совпадают, мёртвых эндпоинтов нет.

| # | Расхождение | Где | Кому |
|---|---|---|---|
| C1 | `emails.*` ведут на `/emails/*`, а в api `/sender/emails/*` (см. L1-web) | `apps/web/api.ts` | frontend |
| C2 | upgrade шлёт `{type:"payment"}`, API принимает только `subscription` / `check` → `400`, ветка `billingOperation !== "purchase"` рендерит `null` | `app/[locale]/(app)/checkout/page.tsx` | frontend (или backend расширит enum) |
| C3 | PATCH todo шлёт `{todoId, completed}`, DTO знает только `completed` → `400` при `forbidNonWhitelisted`: отметить задачу выполненной нельзя (на dev не видно, см. P2 про ValidationPipe) | `app/[locale]/(app)/todos/todos.tsx` | frontend |
| C4 | кнопку удаления todo видят все, а `DELETE /todos/:id` разрешён только ADMIN (USER получает `403`) | `todos.tsx`, `todos.controller.ts` | решить продуктово |
| C5 | `todo-img-upload.tsx` читает `data.imageUrl`, а в ответе `{}` (см. P2 про сериализатор) | web + api | backend |
| C6 | ответы смены email и пароля — `{}` вместо `{success:true}` (Swagger врёт, web смотрит только `ok`) | `user/dto/response` | backend |
| C7 | `POST /user/profile/2fa` всегда `201` с пустым телом, web без условий показывает успех (см. L1) | api + `use-two-factor-form.ts` | backend + frontend |
| C9 | `UserGetProfileResponseDto` объявляет `profile` и `authSettings` массивами, а приходят объекты; в DTO лишний `verifiedToken` | `user/dto/response` | backend |
| C10 | в Swagger есть `@ApiBody` и `@ApiResponse` только у todos; у `/user/*`, `/billing/invoices`, `/billing/checkout`, `/billing/payment-intents`, `/billing/create-portal-session` нет `security`, хотя guard стоит | контроллеры api | backend |

**Рекомендации L2:** добавить `pnpm --filter api test:e2e` в CI; в `eslint.config.mjs` для `test/**` ослабить `require-await` и `no-unnecessary-type-assertion` (сейчас там `eslint-disable` в начале файлов).
