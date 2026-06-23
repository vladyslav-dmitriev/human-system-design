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
RUN npm install -g pnpm tsx

WORKDIR /usr/src/app

# Копируем манифесты для установки зависимостей
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Устанавливаем ВСЕ зависимости (prod + dev, чтобы были все нужные модули)
RUN pnpm install --frozen-lockfile

# Копируем только скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001

# Теперь tsx есть в системе, а все зависимости (включая reflect-metadata) — в node_modules
CMD ["node", "--loader", "tsx", "dist/main.js"]