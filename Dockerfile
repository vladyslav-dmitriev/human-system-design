# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
# Копируем всё содержимое (включая корень с lock-файлом)
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем лок-файл и package.json из корня и API, чтобы pnpm видел структуру
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Устанавливаем зависимости с учетом лок-файла
RUN pnpm install --frozen-lockfile

# Копируем собранный проект
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

WORKDIR /usr/src/app/apps/api

EXPOSE 3001

# Запуск через tsx, который теперь гарантированно установлен в node_modules
CMD ["tsx", "dist/main.js"]