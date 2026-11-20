---
name: nextjs-developer
description: Next.js 16 App Router в apps/web: server и client components, server actions, кэширование и revalidate, proxy.ts, метаданные, loading/error. Используй при создании страниц, роутов, загрузки данных и мутаций. Версия 16 заметно отличается от 14: сверяйся с документацией через context7.
---

# Next.js 16 (App Router)

Приоритет у правил репозитория (`CLAUDE.md`, `apps/web/CLAUDE.md`): FSD-слои, next-intl, URL API из `apps/web/api.ts`. Версия в проекте `^16`, сверяйся с документацией (context7), не пиши по памяти.

## Что изменилось по сравнению с 14, о чём легко забыть

- `middleware.ts` теперь `proxy.ts` (в проекте `apps/web/proxy.ts`). Не создавай `middleware.ts`.
- Request API асинхронные: `params`, `searchParams`, `cookies()`, `headers()` нужно `await`. Тип `params`: `Promise<{ ... }>`.
- `fetch` по умолчанию не кэшируется. Кэш включай явно (`cache`, `next.revalidate`, теги) или через `"use cache"`, если включён `cacheComponents`.
- Turbopack по умолчанию (`next dev --turbopack` уже в скриптах).
- Pages Router не используется: каталог `app/[locale]/...`.

## Правила

1. Server Component по умолчанию. `"use client"` только на листе, где нужны состояние, эффекты или обработчики.
2. Данные грузи на сервере; независимые запросы параллель (`Promise.all`), долгие заверни в `Suspense`.
3. Страницы в `app/[locale]` тонкие: сборка из `widgets/` и `features/`.
4. Мутации: server action или запрос к Nest API. Server action проверяет сессию сама (см. `next-auth-5`), на клиентскую валидацию не полагайся.
5. Метаданные через `generateMetadata` / `metadata`, без ручных `<title>` и `<meta>`.
6. Картинки через `next/image`, шрифты через `next/font`.
7. `loading.tsx` и `error.tsx` для сегментов с асинхронной загрузкой.
8. Секреты только в серверном коде; в клиент попадает только `NEXT_PUBLIC_*`.
9. Производительность: скилл `vercel-react-best-practices`. Деплой и Docker: `nextjs-deployment`.

## Справочники

Предыдущие версии текстов лежат в `references/` и написаны под Next 14. Используй их как общие объяснения, а детали API проверяй:

| Тема | Файл |
|---|---|
| Роутинг, layouts, route groups | `references/app-router.md` |
| RSC, стриминг, границы клиента | `references/server-components.md` |
| Server actions, формы, revalidate | `references/server-actions.md` |
| Загрузка и кэширование данных | `references/data-fetching.md` |

## Перед сдачей

`pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web test:run`, при изменении роутов `pnpm --filter web build`.
