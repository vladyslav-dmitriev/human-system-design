# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
# Копируем всё для сборки
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем только package.json и lock-файлы для установки зависимостей
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# УСТАНАВЛИВАЕМ ЗАВИСИМОСТИ В ФИНАЛЬНОМ ОБРАЗЕ
# --prod гарантирует, что reflect-metadata (который должен быть в dependencies) будет установлен
RUN pnpm install --prod --frozen-lockfile

# Копируем только результат сборки
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001

# Теперь все модули в node_modules, node их увидит
CMD ["node", "dist/main.js"]