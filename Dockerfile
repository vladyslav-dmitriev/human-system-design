# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .

# Устанавливаем зависимости с учетом структуры монорепозитория
RUN pnpm install --frozen-lockfile

# Генерируем Prisma (используем pnpm exec, это надежнее npx в Docker)
# Убедись, что путь к схеме верный
RUN pnpm exec prisma generate --schema=apps/api/src/prisma/schema.prisma

# СБОРКА
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем всё содержимое папки build в корень
COPY --from=stage_builder /usr/src/app/apps/api/dist /usr/src/app/
COPY --from=stage_builder /usr/src/app/node_modules ./node_modules
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./package.json
# Копируем сгенерированного Prisma клиента
COPY --from=stage_builder /usr/src/app/apps/api/src/prisma/generated ./prisma/generated

EXPOSE 3001

# Используем установленный tsx
CMD ["npx", "tsx", "main.js"]