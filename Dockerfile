# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем node_modules из билдера
COPY --from=stage_builder /usr/src/app/node_modules ./node_modules
# Копируем результат сборки
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001

# Используем абсолютный путь к исполняемому файлу tsx
# Это гарантированно запустит именно утилиту tsx, а не попытается найти файл 'tsx' в папке
CMD ["./node_modules/.bin/tsx", "dist/main.js"]