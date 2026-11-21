# syntax=docker/dockerfile:1.7
#
# Один Dockerfile на все образы монорепо. Контекст сборки: корень репозитория.
#
#   docker build --target dev .   # compose (разработка): все зависимости, dev-серверы с hot reload
#   docker build --target api .   # prod api (NestJS)
#   docker build --target web .   # prod web (Next.js standalone)
#
# Версия pnpm закреплена и совпадает с "packageManager" в package.json.

ARG NODE_VERSION=22
ARG PNPM_VERSION=9.0.0

# ---------------------------------------------------------------------------
# base: Node + pnpm + системные библиотеки (openssl нужен Prisma, libc6-compat нужен нативным модулям на musl)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN apk add --no-cache openssl libc6-compat \
    && npm install -g pnpm@${PNPM_VERSION}
ENV PNPM_HOME=/pnpm \
    npm_config_store_dir=/pnpm/store \
    CI=true
WORKDIR /usr/src/app

# ---------------------------------------------------------------------------
# installed: зависимости всего монорепо.
# `pnpm fetch` смотрит только в pnpm-lock.yaml, поэтому слой с загрузкой пакетов
# не инвалидируется правками исходников; store кэшируется между сборками (BuildKit cache mount).
# ---------------------------------------------------------------------------
FROM base AS installed
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline \
    && pnpm --filter api prisma:generate

# ---------------------------------------------------------------------------
# dev: образ для docker compose. Исходники apps/* монтируются томами, команда задаётся в compose.
# Работает от root намеренно: bind-mount с хоста и запись в .next / node_modules без возни с uid.
# Не использовать в проде.
# ---------------------------------------------------------------------------
FROM installed AS dev
CMD ["pnpm", "dev"]

# ---------------------------------------------------------------------------
# prisma-cli: prisma CLI отдельным деревом в /opt/prisma. В apps/api это devDependency, а в prod-набор
# зависимостей (pnpm deploy --prod) dev не входит. Версия берётся из apps/api/package.json,
# чтобы CLI совпадал с @prisma/client.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS prisma-cli
RUN apk add --no-cache openssl
COPY apps/api/package.json /tmp/api-package.json
RUN PRISMA_VERSION="$(node -p "require('/tmp/api-package.json').devDependencies.prisma")" \
    && npm install --prefix /opt/prisma --omit=dev --no-audit --no-fund "prisma@${PRISMA_VERSION}"

# ---------------------------------------------------------------------------
# api-build: сборка Nest и prod-набор зависимостей
# ---------------------------------------------------------------------------
FROM installed AS api-build
RUN pnpm --filter api build
# pnpm deploy: apps/api + только production-зависимости (по pnpm-lock.yaml), без остального монорепо
RUN pnpm --filter api deploy --prod /out
# Prisma Client надо сгенерировать заново уже в /out: deploy копирует пакеты из store без сгенерированного кода
COPY --from=prisma-cli /opt/prisma /opt/prisma
RUN cp apps/api/prisma.config.ts /out/prisma.config.ts \
    && mkdir -p /out/src/prisma \
    && cp apps/api/src/prisma/schema.prisma /out/src/prisma/schema.prisma \
    && cd /out \
    && /opt/prisma/node_modules/.bin/prisma generate

# ---------------------------------------------------------------------------
# api: prod-образ. Миграции (`prisma migrate deploy`) запускает k8s Job из ЭТОГО ЖЕ образа
# (command: /opt/prisma/node_modules/.bin/prisma migrate deploy), поэтому в образе лежат prisma CLI,
# prisma.config.ts и src/prisma (schema + migrations). Так миграции всегда той же версии, что и код,
# и не нужен третий образ. Цена: лишний размер prisma CLI.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS api
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prisma-cli /opt/prisma /opt/prisma
COPY --from=api-build --chown=node:node /out/node_modules ./node_modules
COPY --from=api-build --chown=node:node /out/package.json ./package.json
COPY --from=api-build --chown=node:node /out/prisma.config.ts ./prisma.config.ts
COPY --from=api-build --chown=node:node /usr/src/app/apps/api/dist ./dist
COPY --from=installed --chown=node:node /usr/src/app/apps/api/src/prisma/schema.prisma ./src/prisma/schema.prisma
COPY --from=installed --chown=node:node /usr/src/app/apps/api/src/prisma/migrations ./src/prisma/migrations
USER node
EXPOSE 3001
CMD ["node", "dist/src/main.js"]

# ---------------------------------------------------------------------------
# web-build: next build (output: "standalone" задан в apps/web/next.config.js)
#
# ВАЖНО: NEXT_PUBLIC_* подставляются в клиентский бандл на этапе `next build`, поэтому принимаются как ARG.
# Образ web получается привязанным к окружению (хост, ключи): для другого окружения нужна другая сборка.
# Все NEXT_PUBLIC_* публичны по определению (попадают в браузер), секретов здесь быть не должно.
# NEXTAUTH_SECRET и прочие секреты НЕ ARG: только runtime env (Secret в k8s).
# ---------------------------------------------------------------------------
FROM installed AS web-build
ARG NEXT_PUBLIC_API_CLIENT_URL
ARG NEXT_PUBLIC_API_SERVER_URL
ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY
ARG NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY
ARG NEXT_PUBLIC_CLOUDFLARE_SITE_KEY
ARG NEXT_PUBLIC_AMPLITUDE_API_KEY
ARG NEXT_PUBLIC_GROWTHBOOK_API_HOST
ARG NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY
ENV NEXT_PUBLIC_API_CLIENT_URL=${NEXT_PUBLIC_API_CLIENT_URL} \
    NEXT_PUBLIC_API_SERVER_URL=${NEXT_PUBLIC_API_SERVER_URL} \
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY=${NEXT_PUBLIC_STRIPE_PUBLIC_KEY} \
    NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY=${NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY} \
    NEXT_PUBLIC_CLOUDFLARE_SITE_KEY=${NEXT_PUBLIC_CLOUDFLARE_SITE_KEY} \
    NEXT_PUBLIC_AMPLITUDE_API_KEY=${NEXT_PUBLIC_AMPLITUDE_API_KEY} \
    NEXT_PUBLIC_GROWTHBOOK_API_HOST=${NEXT_PUBLIC_GROWTHBOOK_API_HOST} \
    NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY=${NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY} \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

# ---------------------------------------------------------------------------
# web: prod-образ из .next/standalone. outputFileTracingRoot = корень монорепо,
# поэтому server.js лежит в apps/web/server.js.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS web
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=web-build --chown=node:node /usr/src/app/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /usr/src/app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=node:node /usr/src/app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
