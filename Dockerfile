# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder

# Установка системных зависимостей
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем файлы для установки зависимостей
COPY . .

# Настройка pnpm для плоской структуры
RUN pnpm config set node-linker hoisted

# Установка всех зависимостей проекта
RUN pnpm install --frozen-lockfile

# Генерация Prisma Client
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# Сборка проекта (используем переход в папку, чтобы избежать проблем с путями монорепозитория)
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine

WORKDIR /usr/src/app

# Копируем скомпилированные файлы
# Копируем всю папку dist, чтобы сохранилась структура модулей (исправляет ERR_MODULE_NOT_FOUND)
COPY --from=builder /usr/src/app/apps/api/dist ./dist

# Копируем зависимости
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Копируем package.json
COPY --from=builder /usr/src/app/apps/api/package.json ./package.json

EXPOSE 3001

# Запуск приложения
CMD ["node", "dist/main.js"]