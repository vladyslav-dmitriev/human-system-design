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

# 1. Копируем всё необходимое для pnpm
COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json

# 2. ВАЖНО: Копируем исходники prisma, чтобы генератор их видел
COPY --from=stage_builder /usr/src/app/apps/api/src ./apps/api/src

# 3. Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# 4. Генерируем клиент (теперь src/prisma/schema.prisma существует)
RUN cd apps/api && npx prisma generate --schema=./src/prisma/schema.prisma

# 5. Удаляем dev-зависимости
RUN pnpm prune --prod

# 6. Копируем скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]