# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
# Явно копируем всё содержимое текущей папки
COPY . .
# ДИАГНОСТИКА: Эта строка покажет нам, что реально попало в контейнер
RUN ls -R /usr/src/app | grep schema.prisma || echo "FILE_NOT_FOUND_IN_CONTAINER"

RUN pnpm install --frozen-lockfile
WORKDIR /usr/src/app/apps/api
RUN pnpm run build