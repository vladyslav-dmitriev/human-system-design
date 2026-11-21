# syntax=docker/dockerfile:1.7

# Образ api. Этапы:
#   dev   - полный install и Prisma Client; используется docker-compose (target: dev) с bind-mount исходников;
#   build - nest build + pnpm deploy --prod (только prod-зависимости);
#   prod  - финальный образ (последний этап, target по умолчанию): dist, prod node_modules, prisma schema/миграции.

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

# --- Этап 2: сборка и prod-деплой ---
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
# Prisma Client в prod-дереве; CLI берём из dev-дерева, в образ он не попадает
RUN cd /out && DATABASE_URL=postgresql://x:x@localhost:5432/x \
    node /usr/src/app/apps/api/node_modules/prisma/build/index.js generate --schema=./src/prisma/schema.prisma

# --- Этап 3: финальный образ ---
FROM ${NODE_IMAGE} AS prod
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "const p=process.env.SERVER_PORT||3001;fetch('http://127.0.0.1:'+p+'/health').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
