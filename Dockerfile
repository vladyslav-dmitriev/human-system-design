# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile

# ВАЖНО: Генерируем клиент ДО сборки, чтобы TypeScript увидел типы моделей
RUN npx prisma generate --schema=./apps/api/src/prisma/schema.prisma

# Теперь, когда типы сгенерированы, запускаем билд
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем манифесты
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Копируем скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

# Устанавливаем ТОЛЬКО production-зависимости
RUN pnpm install --frozen-lockfile --prod

# Генерируем клиент для рантайма (чтобы бинарники соответствовали Alpine Linux)
RUN npx prisma generate --schema=./apps/api/src/prisma/schema.prisma

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]