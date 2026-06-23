# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# Устанавливаем зависимости
RUN npm install

# Prisma (уже работает, оставляем)
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# БИЛДИМ: просто заходим в папку и запускаем скрипт там
WORKDIR /usr/src/app/apps/api
RUN npm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат сборки из папки API в корень финального образа
COPY --from=builder /usr/src/app/apps/api/dist ./dist
# Копируем node_modules из папки API
COPY --from=builder /usr/src/app/apps/api/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/api/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]