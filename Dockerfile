# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
# Копируем всё из корня (контекст билда - корень)
COPY . .
RUN pnpm install --frozen-lockfile
# Собираем только API
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем сгенерированные файлы для продакшена
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
# Копируем схему напрямую из известного места
COPY --from=stage_builder /usr/src/app/apps/api/prisma ./prisma

# Установка и генерация клиента
RUN pnpm install --prod --frozen-lockfile && \
    pnpm exec prisma generate

# Копируем результат сборки
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]