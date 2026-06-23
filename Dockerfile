# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё содержимое проекта
COPY . .

# Устанавливаем все зависимости в корне
RUN npm install

# Устанавливаем @prisma/client отдельно для приложения api, 
# чтобы Prisma точно видела путь к node_modules
RUN npm install @prisma/client --prefix apps/api

# Генерируем Prisma Client (путь к схеме указываем явно)
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим проект (предполагаем, что в корне есть скрипт build)
RUN npm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем скомпилированный код и зависимости
# Проверь путь: обычно Nx/NestJS кладет билд в dist/apps/api
COPY --from=builder /usr/src/app/dist/apps/api ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

# Запускаем приложение
CMD ["node", "dist/main.js"]