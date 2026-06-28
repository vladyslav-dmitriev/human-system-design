# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .

RUN pnpm install --frozen-lockfile

# Используем pnpm exec — это гарантированно находит prisma, 
# даже если она установлена как зависимость в воркспейсе
RUN pnpm exec prisma generate --schema=./apps/api/src/prisma/schema.prisma

# Билд проекта
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