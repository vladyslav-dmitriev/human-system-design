# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё для корректной работы Turborepo
COPY . .

# Устанавливаем зависимости
# Если используешь npm, убедись, что package-lock.json есть в корне
RUN npm install

# Генерируем клиент Prisma именно для приложения api
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим проект через Turbo (явно указываем только api)
RUN npx turbo run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат билда (обычно turbo кладет его в dist или .turbo/output)
# Проверь структуру: чаще всего для Turbo это dist внутри папки приложения
COPY --from=builder /usr/src/app/apps/api/dist ./dist
COPY --from=builder /usr/src/app/apps/api/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/api/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]