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
# Глобальная установка tsx — это даст нам команду 'tsx' в PATH
RUN npm install -g tsx

WORKDIR /usr/src/app

# Копируем результат сборки
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001

# Теперь команда 'tsx' будет доступна глобально
CMD ["tsx", "dist/main.js"]