# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем манифесты
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# Копируем исходники, необходимые для генерации Prisma
COPY --from=stage_builder /usr/src/app/apps/api/src ./apps/api/src

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# 1. Генерация Prisma Client
RUN cd apps/api && npx prisma generate --schema=./src/prisma/schema.prisma

# 2. ФИКС: Принудительно копируем клиент в папку dist, где его ищет Node.js
# Мы копируем то, что Prisma создала в node_modules, в папку dist, 
# чтобы путь ./generated/client стал доступен для require()
RUN mkdir -p /usr/src/app/apps/api/dist/prisma/generated/client && \
    cp -r /usr/src/app/node_modules/.prisma/client/* /usr/src/app/apps/api/dist/prisma/generated/client/

# 3. Удаляем dev-зависимости
RUN pnpm prune --prod

# 4. Копируем скомпилированный код (поверх того, что мы уже настроили)
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]