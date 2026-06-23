# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
# Устанавливаем pnpm глобально
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# Устанавливаем зависимости через pnpm
RUN pnpm install

# Prisma (используем pnpm для вызова)
RUN pnpm prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат
COPY --from=builder /usr/src/app/apps/api/dist ./dist
# Для pnpm node_modules могут быть сложнее, поэтому копируем целиком
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]