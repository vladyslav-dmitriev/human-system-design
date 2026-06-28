# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .

RUN pnpm install --frozen-lockfile

# Используем `pnpm prisma`, это работает надежнее, чем npx или pnpm exec
RUN pnpm prisma generate --schema=./apps/api/src/prisma/schema.prisma

# Билд проекта
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем манифесты
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Копируем скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

# ВАЖНО: Копируем схему в финальный образ
COPY --from=stage_builder /usr/src/app/apps/api/src/prisma ./apps/api/src/prisma

# Устанавливаем только production-зависимости
# Пакет "prisma" должен быть в devDependencies, а "@prisma/client" в dependencies
RUN pnpm install --frozen-lockfile --prod

# Генерируем клиент для рантайма
RUN pnpm prisma generate --schema=./apps/api/src/prisma/schema.prisma

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]