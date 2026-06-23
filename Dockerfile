# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# ДИАГНОСТИКА: если lock-файла нет в списке, значит он в .dockerignore
RUN ls -la

# Устанавливаем зависимости
RUN npm install

# Устанавливаем Prisma локально
RUN npm install prisma @prisma/client --prefix apps/api

# Генерируем клиент
RUN ./apps/api/node_modules/.bin/prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим через npx, явно указав путь к turbo
# И добавляем --no-daemon, чтобы избежать ошибок с путями демона Turbo
RUN npx turbo run build --filter=api --no-daemon

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/apps/api/dist ./dist
COPY --from=builder /usr/src/app/apps/api/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]