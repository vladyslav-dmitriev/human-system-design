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

# Добавляем путь pnpm в PATH прямо здесь
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /usr/src/app

# Отключаем проверки
ENV PNPM_IGNORE_POLICY=true
ENV CI=true

# Копируем манифесты
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json
COPY --from=stage_builder /usr/src/app/apps/api/src/prisma/schema.prisma ./prisma/schema.prisma

# Установка и генерация
RUN pnpm install --prod --no-frozen-lockfile && \
    # Устанавливаем зависимости конкретно для api, чтобы они были доступны
    # Используем --filter для монорепозитория
    pnpm --filter api install --prod --no-frozen-lockfile && \
    # Устанавливаем prisma и клиент отдельно, так как это критические зависимости
    pnpm add prisma @prisma/client reflect-metadata cookie-parser && \
    node ./node_modules/prisma/build/index.js generate --schema=./prisma/schema.prisma

COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]