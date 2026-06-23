# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# 1. Копируем файлы для установки
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json
# Копируем схему prisma, она нужна для генерации клиента
COPY --from=stage_builder /usr/src/app/prisma ./prisma 

# 2. Устанавливаем зависимости
RUN pnpm install --prod --frozen-lockfile

# 3. КРИТИЧЕСКИЙ ШАГ: Генерируем клиент Prisma внутри финального образа
RUN pnpm exec prisma generate

# 4. Копируем собранный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]