# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# Устанавливаем зависимости в корне
RUN npm install

# ПРИНУДИТЕЛЬНО устанавливаем Prisma и клиент в папку api, 
# чтобы решить проблему "Could not resolve @prisma/client"
RUN npm install prisma @prisma/client --prefix apps/api

# Генерируем клиент, явно указывая путь к исполняемому файлу prisma
RUN ./apps/api/node_modules/.bin/prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим через Turbo
RUN npx turbo run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат
COPY --from=builder /usr/src/app/apps/api/dist ./dist
COPY --from=builder /usr/src/app/apps/api/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]