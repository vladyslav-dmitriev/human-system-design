# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .

RUN pnpm install --frozen-lockfile

# Генерируем клиент, чтобы билд прошел успешно
RUN pnpm exec prisma generate --schema=./apps/api/src/prisma/schema.prisma

# Билд проекта
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

# ВАЖНО: Копируем схему в финальный образ, чтобы prisma generate сработал
COPY --from=stage_builder /usr/src/app/apps/api/src/prisma ./apps/api/src/prisma

# Устанавливаем только production-зависимости
# ВНИМАНИЕ: Prisma должна быть в 'dependencies' (не devDependencies), 
# иначе она удалится при --prod
RUN pnpm install --frozen-lockfile --prod

# Теперь генерация сработает, так как мы скопировали схему
RUN pnpm exec prisma generate --schema=./apps/api/src/prisma/schema.prisma

# Копируем скомпилированный код
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]