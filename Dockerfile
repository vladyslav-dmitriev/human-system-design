# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# СБОРКА
WORKDIR /usr/src/app/apps/api
RUN pnpm run build
# ДОБАВЬ ЭТУ СТРОКУ, ЧТОБЫ УВИДЕТЬ, ГДЕ ФАЙЛЫ:
RUN ls -R /usr/src/app/apps/api

# --- Этап 2: Финальный образ ---
# ... (остальной Dockerfile)

# ... остальной Dockerfile
# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# ВАЖНО: Мы берем файлы ИМЕННО из того места, где они были созданы
# stage_builder находится в /usr/src/app/apps/api
COPY --from=stage_builder /usr/src/app/apps/api/dist /usr/src/app/dist
COPY --from=stage_builder /usr/src/app/node_modules ./node_modules
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./package.json
# Копируем Prisma клиента, если он там есть
COPY --from=stage_builder /usr/src/app/apps/api/src/prisma/generated ./prisma/generated

EXPOSE 3001

# Теперь мы запускаем из папки dist, куда мы все скопировали
CMD ["npx", "tsx", "dist/main.js"]