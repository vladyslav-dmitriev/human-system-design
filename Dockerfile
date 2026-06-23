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
# Устанавливаем pnpm, чтобы управлять зависимостями
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем только package.json и lock-файлы для установки зависимостей
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json
# Копируем результат сборки
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

# УСТАНАВЛИВАЕМ ВСЁ ЗАНОВО В ФИНАЛЬНЫЙ ОБРАЗ
# Это гарантирует, что все бинарники (включая tsx) будут на своих местах
RUN pnpm install --frozen-lockfile

EXPOSE 3001

# Теперь tsx будет гарантированно доступен в PATH
CMD ["tsx", "dist/main.js"]