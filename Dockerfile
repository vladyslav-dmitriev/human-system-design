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

# Копируем всё необходимое для установки (целиком структуру для pnpm)
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api ./apps/api

# Устанавливаем все зависимости (чтобы были доступны в node_modules)
RUN pnpm install --frozen-lockfile

# 1. Генерация Prisma Client
RUN cd apps/api && npx prisma generate --schema=./src/prisma/schema.prisma

# 2. Поиск и копирование сгенерированного клиента
# Мы ищем папку .prisma/client и копируем её содержимое в нужный dist
RUN CLIENT_PATH=$(find /usr/src/app -name "client" | grep ".prisma/client" | head -n 1) && \
    echo "Found client at: $CLIENT_PATH" && \
    mkdir -p /usr/src/app/apps/api/dist/prisma/generated/client && \
    cp -r $CLIENT_PATH/* /usr/src/app/apps/api/dist/prisma/generated/client/
# Очистка dev-зависимостей
RUN pnpm prune --prod

# Копируем остальной скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]