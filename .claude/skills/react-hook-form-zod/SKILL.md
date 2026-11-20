---
name: react-hook-form-zod
description: Формы в apps/web на react-hook-form + zod: схемы, zodResolver, ошибки с i18n, состояния отправки, серверные ошибки Nest API, доступность. Используй при создании и правке любых форм (логин, регистрация, смена email и пароля, оплата).
---

# react-hook-form + zod

Приоритет у правил репозитория (`CLAUDE.md`, `apps/web/CLAUDE.md`). Образцы: `features/change-email-form`, `features/change-password-form`, `widgets/auth/*`. Схемы лежат в `shared/lib/zod.ts` или рядом с формой. API zod 4 отличается от 3: сверяйся с документацией (context7).

## Правила

1. Одна zod-схема на форму, тип выводи из неё: `type Values = z.infer<typeof schema>`. Не дублируй типы руками.
2. `useForm<Values>({ resolver: zodResolver(schema), defaultValues })`. Все поля имеют `defaultValues`, иначе контролируемые поля станут неконтролируемыми.
3. Тексты ошибок через next-intl: в схеме используй ключи (`"errors.email.invalid"`) и переводи при показе, либо собирай схему фабрикой `createSchema(t)`. Хардкод английских сообщений в схеме (как сейчас в `signInSchema`) нарушает правило i18n: не копируй его в новый код.
4. Поля через компоненты формы из `shared/ui` (shadcn `Form`, `FormField`, `FormMessage`), не голые `<input>`. У каждого поля есть `label`, ошибки привязаны через `aria-describedby`.
5. Отправка: блокируй кнопку по `formState.isSubmitting`, защищай от двойного клика. Запросы только по URL из `apps/web/api.ts`.
6. Ошибки сервера (400 с полями, 401, 409) отображай: поля через `setError(field, { message })`, общую ошибку через `setError("root", ...)`. Не показывай сырые тексты исключений.
7. Валидация на клиенте это удобство, не защита: серверные DTO (`class-validator`) обязательны. Правила схемы и DTO должны совпадать (длины, форматы).
8. Не храни пароли и токены в state вне формы, не логируй значения.

## Проверка

Тест vitest на ошибки валидации и успешную отправку (`unit-testing`), сценарий в Playwright для критичных форм (`qa-automation`).
