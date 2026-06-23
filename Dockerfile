# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /usr/src/app/apps/api
RUN pnpm prisma generate --schema=src/prisma/schema.prisma
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем только package.json для установки зависимостей
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Устанавливаем только продакшн зависимости (без devDependencies)
RUN pnpm install --prod --frozen-lockfile

# Копируем результат сборки
COPY --from=stage_builder /usr/src/app/apps/api/dist /usr/src/app/dist

EXPOSE 3001

# Запуск через чистый node, так как после 'npm install --prod'
# все нужные библиотеки уже есть в node_modules
CMD ["node", "dist/main.js"]