# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
# Собираем проект
RUN pnpm run build --filter=api 

# --- Этап 2: Деплой (Критический шаг) ---
# Создаем чистую папку только с нужными зависимостями для api
RUN pnpm --filter=api --prod deploy /usr/src/app/deploy

# --- Этап 3: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем только то, что подготовил pnpm deploy
COPY --from=stage_builder /usr/src/app/deploy .
# Копируем скомпилированные файлы
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001

# Теперь все зависимости гарантированно лежат в node_modules рядом с dist
CMD ["node", "dist/main.js"]