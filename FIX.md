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
