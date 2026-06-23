# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
# Устанавливаем необходимые зависимости для сборки
RUN apk add --no-cache openssl libc6-compat
# УСТАНАВЛИВАЕМ PNPM
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .

# Теперь эта команда сработает
RUN pnpm config set node-linker hoisted
RUN pnpm install --frozen-lockfile
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# ... остальной Dockerfile