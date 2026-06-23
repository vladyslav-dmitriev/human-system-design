# --- Этап 1: Сборка ---
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Копируем всё
COPY . .

# Явно указываем Turbo, какой менеджер использовать (замени на pnpm или yarn, если не npm)
ENV TURBO_PACKAGE_MANAGER=npm

# Устанавливаем зависимости (теперь Turbo должен их увидеть)
RUN npm install

# Устанавливаем Prisma локально, чтобы избежать конфликтов путей
RUN npm install prisma @prisma/client --prefix apps/api

# Генерируем клиент через прямой вызов бинарника
RUN ./apps/api/node_modules/.bin/prisma generate --schema=apps/api/src/prisma/schema.prisma

# Билдим проект
RUN npx turbo run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем скомпилированный код
COPY --from=builder /usr/src/app/apps/api/dist ./dist
# Копируем node_modules из API, чтобы приложение имело доступ к @prisma/client
COPY --from=builder /usr/src/app/apps/api/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]