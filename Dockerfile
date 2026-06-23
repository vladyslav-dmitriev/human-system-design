# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# 1. Устанавливаем все зависимости в корне
RUN npm install

# 2. Генерируем клиент. 
# Используем прямой вызов из node_modules, чтобы избежать проблем с npx/pnpm
RUN ./node_modules/.bin/prisma generate --schema=apps/api/src/prisma/schema.prisma

# 3. Билдим проект (используем npm команду для конкретного workspace)
# Если используешь npm workspaces, эта команда сработает
RUN npm run build -w apps/api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат сборки
COPY --from=builder /usr/src/app/apps/api/dist ./dist
# Копируем node_modules из корня, чтобы @prisma/client был доступен
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]