# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
# Устанавливаем pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# Устанавливаем зависимости
RUN pnpm install

# Генерируем клиент Prisma
# Вместо попытки запустить pnpm prisma, идем напрямую в папку .bin
RUN ./node_modules/.bin/prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат
COPY --from=builder /usr/src/app/apps/api/dist ./dist
# Копируем node_modules из корня (pnpm использует общие модули)
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]