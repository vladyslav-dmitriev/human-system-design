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

# Копируем манифесты из этапа сборки
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json
COPY --from=stage_builder /usr/src/app/apps/api/src ./apps/api/src

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Генерация Prisma Client и умное копирование
# Мы используем поиск пути, так как pnpm создает сложные симлинки
RUN cd apps/api && npx prisma generate --schema=./src/prisma/schema.prisma
RUN CLIENT_PATH=$(find /usr/src/app -name "client" | grep ".prisma/client" | head -n 1) && \
    mkdir -p /usr/src/app/apps/api/dist/prisma/generated/client && \
    cp -r $CLIENT_PATH/* /usr/src/app/apps/api/dist/prisma/generated/client/

# Очистка dev-зависимостей
RUN pnpm prune --prod

# Копируем скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]