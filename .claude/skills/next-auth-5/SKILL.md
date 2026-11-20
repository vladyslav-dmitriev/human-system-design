---
name: next-auth-5
description: next-auth 5 (beta) в apps/web: провайдеры, JWT-сессии, защита маршрутов, токены Nest API. Используй при правке логина, сессий и защищённых страниц.
---

# next-auth 5 (Auth.js)

Приоритет у правил репозитория (`CLAUDE.md`). Версия `5.0.0-beta`: API отличается от v4, сверяйся с документацией (context7, если установлен), не пиши по памяти.

## Структура проекта

- `apps/web/auth.config.ts`: провайдеры (Google, GitHub), `pages.signIn`, колбэк `authorized`, `basePath: "/api/auth"`.
- `apps/web/auth.ts`: экспорт `auth`, `signIn`, `signOut`, `handlers`.
- `apps/web/proxy.ts`: защита маршрутов и редиректы на `ROUTE.LOGIN` / `ROUTE.DASHBOARD`, комбинирован с `next-intl`.
- URL API только из `apps/web/api.ts`.

## Правила

1. Сессию читай на сервере через `await auth()` (Server Components, route handlers, server actions), на клиенте через `useSession` внутри `SessionProvider`.
2. **Проверку доступа делай на сервере у данных, а не только в `proxy.ts`.** Прокси и `authorized` это первая линия; каждая server action и route handler сама проверяет `auth()`, а настоящая авторизация (владелец ресурса) на стороне Nest API.
3. Секреты (`AUTH_SECRET` / `NEXTAUTH_SECRET`, client secret провайдеров) только в серверных env. Не используй `NEXT_PUBLIC_*` для них. Не логируй токены, cookies и содержимое сессии (никаких `console.log(token)`).
4. Токен доступа к Nest API храни внутри JWT / сессии через колбэки `jwt` и `session`; в клиентский объект сессии отдавай только то, что нужно UI. Реализуй обновление токена и обработку истёкшей сессии (редирект на вход).
5. `secureCookie` и имя cookie зависят от окружения (`__Secure-` на https). Не хардкодь имя cookie в нескольких местах: бери из одного места или из конфигурации библиотеки.
6. Редиректы после входа: `callbackUrl` валидируй (только относительные пути своего приложения), иначе open redirect.
7. Типы: расширяй `Session` и `JWT` через module augmentation (`next-auth` / `next-auth/jwt`), не используй `any`.
8. Выход: `signOut` как server action или через форму, с учётом локали в `redirectTo`.
9. Учётные данные (credentials) принимай через zod-валидацию; ответы об ошибке не должны раскрывать, существует ли пользователь.
10. С next-intl: проверка пути в `proxy.ts` должна учитывать префикс локали, редиректы строй через `i18n/navigation`.

## Проверка

- Незалогиненный пользователь не видит защищённые страницы и данные (проверь и прямой запрос).
- Залогиненный не попадает на страницы входа.
- В логах и ответах нет токенов.
