# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder

# Установка необходимых системных библиотек
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем всё содержимое проекта
COPY . .

# Настройка pnpm для плоской структуры (решает проблему с путями)
RUN pnpm config set node-linker hoisted

# Установка зависимостей и генерация Prisma
RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate --schema=apps/api/src/prisma/schema.prisma

# Сборка приложения
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine

WORKDIR /usr/src/app

# Копируем только то, что нужно для работы
# 1. Скомпилированный код
COPY --from=builder /usr/src/app/apps/api/dist ./dist
# 2. Необходимые зависимости (копируем из корня, так как они сhoisted)
COPY --from=builder /usr/src/app/node_modules ./node_modules
# 3. Файлы package.json для корректного запуска
COPY --from=builder /usr/src/app/apps/api/package.json ./package.json

EXPOSE 3001

# Запуск приложения
CMD ["node", "dist/main.js"]