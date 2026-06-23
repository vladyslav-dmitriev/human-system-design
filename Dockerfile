# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# 1. Устанавливаем все зависимости (добавляем --unsafe-perm для корректности в Docker)
RUN npm install --unsafe-perm

# 2. Устанавливаем Prisma явно, если его нет в node_modules
RUN npm install prisma @prisma/client

# 3. Теперь генерируем клиент, используя глобальный npx
# npx сам найдет установленный пакет в node_modules/.bin
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# 4. Билдим (замени 'build' на имя твоего скрипта, если оно другое)
RUN npm run build --workspace=apps/api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем результат
COPY --from=builder /usr/src/app/apps/api/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]