# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm config set node-linker hoisted
RUN pnpm install --frozen-lockfile
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# СБОРКА
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем содержимое dist (включая все подпапки) в корень /usr/src/app
COPY --from=stage_builder /usr/src/app/apps/api/dist .

# Копируем node_modules
COPY --from=stage_builder /usr/src/app/node_modules ./node_modules
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./package.json

EXPOSE 3001

CMD ["node", "main.js"]