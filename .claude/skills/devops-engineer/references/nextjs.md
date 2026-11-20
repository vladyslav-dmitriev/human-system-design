# Next.js в production (`apps/web`)

- **Standalone:** `output: 'standalone'` в `next.config`; в образ копируются `.next/standalone`, `.next/static` и `public`; запуск `node server.js`. В монорепо Docker-контекст должен включать workspace (удобно `turbo prune web --docker`).
- **Переменные окружения:** `NEXT_PUBLIC_*` вшиваются в бандл при сборке (передавай как build-arg), остальные читаются в рантайме на сервере. Не клади секреты в `NEXT_PUBLIC_*`. URL API: `NEXT_PUBLIC_API_CLIENT_URL` (браузер) и `NEXT_PUBLIC_API_SERVER_URL` (сервер), см. `apps/web/api.ts`.
- **Health check:** лёгкий route handler (например `/api/health`, без обращений к БД) для `HEALTHCHECK`, liveness и readiness.
- **Server Actions при нескольких репликах:** задай одинаковый `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (base64, 32 байта: `openssl rand -base64 32`) в секретах, иначе реплики не расшифруют чужие замыкания.
- **Кэш:** при нескольких репликах общий кэш Next (ISR, fetch cache) нужен через `cacheHandler`, иначе у реплик будет разный кэш.
- **Образ:** multi-stage, не root-пользователь, `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`. Общие приёмы: `docker-patterns.md`.
