FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем только файлы зависимостей для кэширования
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Устанавливаем всё (надежнее для монорепозитория)
RUN npm install

# Копируем исходники
COPY . .

# Генерируем Prisma
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим (убедись, что этот скрипт собирает именно api)
RUN npm run build api

# Финальный образ для запуска
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем только скомпилированный код и нужные файлы
COPY --from=builder /usr/src/app/dist/apps/api ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]