# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем файлы конфигурации зависимостей
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Устанавливаем все зависимости
RUN npm install

# Копируем остальной код
COPY . .

# Генерируем Prisma Client (убедись, что @prisma/client есть в dependencies apps/api/package.json)
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# Собираем проект (предполагаем, что в корневом package.json есть скрипт build)
# Если сборка идет через NX, команда может быть "npx nx build api"
RUN npm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем скомпилированные файлы из этапа builder
# ВАЖНО: убедись, что путь соответствует структуре твоего dist
COPY --from=builder /usr/src/app/dist/apps/api ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Устанавливаем переменную окружения для продакшена
ENV NODE_ENV=production

EXPOSE 3001

# Запускаем приложение
CMD ["node", "dist/main.js"]