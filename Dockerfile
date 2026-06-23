# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
# Копируем всё для установки зависимостей
COPY . .

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Переходим в папку API и генерируем Prisma там, где есть node_modules
WORKDIR /usr/src/app/apps/api
RUN pnpm prisma generate --schema=src/prisma/schema.prisma

# Билд проекта
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем из билдера только необходимое
# Копируем результат билда (папку dist)
COPY --from=stage_builder /usr/src/app/apps/api/dist /usr/src/app/
# Копируем node_modules (они нужны для запуска)
COPY --from=stage_builder /usr/src/app/node_modules /usr/src/app/node_modules
# Копируем package.json для запуска
COPY --from=stage_builder /usr/src/app/apps/api/package.json /usr/src/app/package.json

EXPOSE 3001

# Используем установленный в node_modules tsx
CMD ["npx", "tsx", "main.js"]