# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
# Копируем всё содержимое для сборки
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем необходимые файлы конфигурации для работы pnpm
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
# Копируем содержимое папки api целиком, чтобы сохранить структуру путей
COPY --from=stage_builder /usr/src/app/apps/api ./apps/api

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерация Prisma Client через прямой вызов
RUN SCHEMA_PATH=$(find /usr/src/app/apps/api -name "schema.prisma" | grep -v "generated" | head -n 1) && \
    echo "Using schema: $SCHEMA_PATH" && \
    # Ищем бинарник Prisma в node_modules/.bin
    PRISMA_BIN=$(find /usr/src/app/node_modules -name prisma | grep ".bin/prisma" | head -n 1) && \
    echo "Using binary: $PRISMA_BIN" && \
    $PRISMA_BIN generate --schema=$SCHEMA_PATH

# Очистка dev-зависимостей
RUN pnpm prune --prod

# Копируем только скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]