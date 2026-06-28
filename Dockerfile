# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем только необходимые файлы для установки зависимостей
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# 1. Генерация Prisma Client
RUN SCHEMA_PATH=$(find /usr/src/app/apps/api -name "schema.prisma" | grep -v "generated" | head -n 1) && \
    PRISMA_BIN=$(find /usr/src/app/node_modules -name prisma | grep ".bin/prisma" | head -n 1) && \
    $PRISMA_BIN generate --schema=$SCHEMA_PATH

# 2. ПРИНУДИТЕЛЬНОЕ копирование сгенерированного клиента в dist
# Это решает проблему MODULE_NOT_FOUND для ./generated/client
RUN mkdir -p /usr/src/app/apps/api/dist/prisma/generated/client && \
    cp -r /usr/src/app/apps/api/node_modules/.prisma/client/* /usr/src/app/apps/api/dist/prisma/generated/client/

# Очистка dev-зависимостей (оставит только то, что в dependencies)
RUN pnpm prune --prod

# Копируем скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]