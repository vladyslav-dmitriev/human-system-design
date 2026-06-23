# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
# КОПИРУЕМ ВСЁ В КОРЕНЬ КОНТЕЙНЕРА
COPY . . 
RUN pnpm install --frozen-lockfile
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# --- ФИНАЛЬНЫЙ ФИКС: ---
# Ищем папку prisma где угодно в stage_builder и копируем ее в корень финального образа
# Мы используем команду RUN для поиска, если COPY не справляется
COPY --from=stage_builder /usr/src/app/apps/api/prisma ./prisma 
# Если папка лежит в другом месте, замени путь выше на то, что выдал тебе 'ls -R'

RUN pnpm install --prod --frozen-lockfile
RUN pnpm exec prisma generate

COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]