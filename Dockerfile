# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем критически важные файлы для установки зависимостей
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# УСТАНОВКА: устанавливаем всё БЕЗ --prod, чтобы все зависимости (в т.ч. NestJS) попали в node_modules
# Это гарантирует, что все ссылки внутри монорепозитория будут работать
RUN pnpm install --frozen-lockfile

# Генерация Prisma
RUN node ./node_modules/prisma/build/index.js generate --schema=./apps/api/src/prisma/schema.prisma

# Копируем только скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

# УДАЛЯЕМ только то, что НЕ нужно в продакшене (например, исходники и лишние инструменты)
# Но оставляем node_modules нетронутым, чтобы NestJS нашел свои модули
RUN pnpm prune --prod

EXPOSE 3001
CMD ["node", "dist/main.js"]