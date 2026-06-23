# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# Установка зависимостей
RUN npm install

# Prisma (теперь через npx, так как зависимости уже установлены)
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# ПРЯМОЙ ВЫЗОВ СБОРКИ (вместо турбо)
RUN npm run build --workspace=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат
COPY --from=builder /usr/src/app/apps/api/dist ./dist
COPY --from=builder /usr/src/app/apps/api/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]