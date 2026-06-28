# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
# Устанавливаем все зависимости и собираем проект
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем файлы, необходимые для pnpm workspace
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Установка зависимостей (устанавливаем всё, чтобы pnpm создал корректные линки)
RUN pnpm install --frozen-lockfile

# Генерация Prisma Client
# Переходим в директорию api, чтобы контекст pnpm был привязан к этому пакету
RUN cd apps/api && \
    pnpm exec prisma generate --schema=./src/prisma/schema.prisma

# Удаляем только dev-зависимости (typescript, prisma cli и т.д.)
# Все зависимости, нужные для работы (NestJS, cookie-parser и т.д.), останутся
RUN pnpm prune --prod

# Копируем собранный dist из первого этапа
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]