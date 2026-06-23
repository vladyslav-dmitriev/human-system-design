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
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем манифесты
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# АВТОМАТИЧЕСКИЙ ПОИСК И КОПИРОВАНИЕ SCHEMA.PRISMA
# Мы не копируем конкретный путь, а находим файл и копируем папку, где он лежит
RUN mkdir -p /usr/src/app/prisma && \
    cp $(find /usr/src/app -name "schema.prisma" | head -n 1) /usr/src/app/prisma/schema.prisma

RUN pnpm install --prod --frozen-lockfile
RUN pnpm exec prisma generate

# Копируем собранный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]