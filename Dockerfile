# syntax=docker/dockerfile:1.7

# Один Dockerfile на все образы монорепо. Контекст сборки: корень репозитория. Этапы:
#   dev        - полный install и Prisma Client; используется docker-compose (target: dev) с bind-mount исходников;
#   build      - nest build + pnpm deploy --prod (только prod-зависимости api);
#   prisma-cli - prisma CLI отдельным деревом для Job миграций в k8s;
#   web-build  - next build (output: "standalone");
#   web        - prod-образ web (docker build --target web .);
#   prod       - prod-образ api (последний этап, target по умолчанию): dist, prod node_modules, prisma schema/миграции.
# Этап prod должен оставаться последним: CI и docker build без --target собирают api.

# node:22-alpine (22.x). Обновляйте digest вместе с тегом.
ARG NODE_IMAGE=node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a

# --- Этап 1: dev (полный install) ---
FROM ${NODE_IMAGE} AS dev
RUN apk add --no-cache openssl libc6-compat
# Версия pnpm = packageManager в корневом package.json
RUN npm install -g pnpm@9.0.0
WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
# Prisma Client нужен и для build, и для dev-запуска
RUN pnpm --filter api exec prisma generate --schema=./src/prisma/schema.prisma

# --- Этап 2: сборка api и prod-деплой ---
FROM dev AS build
RUN pnpm --filter api build
# Путь точки входа после nest build (prisma.config.ts выносит rootDir на уровень пакета).
# Если backend изменит tsconfig.build.json, поправьте здесь и в CMD.
RUN test -f apps/api/dist/src/main.js
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm --filter api deploy --prod /out
# deploy не копирует dist (он в .gitignore): добавляем явно, из src оставляем только prisma
RUN cp -r apps/api/dist /out/dist && \
    cp -r /out/src/prisma /tmp/prisma && \
    rm -r /out/src && \
    mkdir -p /out/src && mv /tmp/prisma /out/src/prisma && \
    { [ ! -d /out/test ] || rm -r /out/test; }
# Prisma Client в prod-дереве; CLI берём из dev-дерева
RUN cd /out && DATABASE_URL=postgresql://x:x@localhost:5432/x \
    node /usr/src/app/apps/api/node_modules/prisma/build/index.js generate --schema=./src/prisma/schema.prisma

# --- Этап 3: prisma CLI для миграций ---
# В apps/api prisma - devDependency и в prod-дерево не попадает. Job миграций в k8s запускается из prod-образа api
# (/opt/prisma/node_modules/.bin/prisma migrate deploy), поэтому CLI кладём отдельным деревом той же версии,
# что и @prisma/client. Так миграции всегда той же версии, что и код, без отдельного образа.
FROM ${NODE_IMAGE} AS prisma-cli
COPY apps/api/package.json /tmp/api-package.json
RUN PRISMA_VERSION="$(node -p "require('/tmp/api-package.json').devDependencies.prisma")" && \
    npm install --prefix /opt/prisma --omit=dev --no-audit --no-fund "prisma@${PRISMA_VERSION}"

# --- Этап 4: сборка web ---
# NEXT_PUBLIC_* подставляются в бандл на этапе next build, поэтому это ARG: образ web привязан к окружению
# (хост, публичные ключи), для другого окружения нужна другая сборка. Все NEXT_PUBLIC_* публичны (попадают
# в браузер), секретов здесь быть не должно. NEXTAUTH_SECRET и прочие секреты - только runtime env (Secret в k8s).
FROM dev AS web-build
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

# --- Этап 5: prod-образ web ---
# outputFileTracingRoot = корень монорепо, поэтому server.js лежит в apps/web/server.js внутри standalone.
FROM ${NODE_IMAGE} AS web
RUN apk add --no-cache tini
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
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]

# --- Этап 6: prod-образ api (последний, target по умолчанию) ---
FROM ${NODE_IMAGE} AS prod
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=prisma-cli /opt/prisma /opt/prisma
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "const p=process.env.SERVER_PORT||3001;fetch('http://127.0.0.1:'+p+'/health').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
