# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .

RUN pnpm install --frozen-lockfile && \
    pnpm store prune

# Использование прямого пути к бинарнику. 
# В монорепозиториях это работает независимо от того, где установлен пакет.
RUN find . -name "prisma" -type f -executable | grep ".bin/prisma" | head -n 1 | xargs -I {} {} generate --schema=./apps/api/src/prisma/schema.prisma

# Билд проекта
RUN pnpm run build --filter=api

# --- Этап 2: Финальный образ ---
FROM node:22-alpine AS final_runner

# 1. Создаем непривилегированного пользователя (UID 1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json
COPY --from=stage_builder /usr/src/app/apps/api/src/prisma ./apps/api/src/prisma
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist
COPY --from=stage_builder /usr/src/app /usr/src/app

RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Тот же надежный метод прямого вызова бинарника
RUN find . -name "prisma" -type f -executable | grep ".bin/prisma" | head -n 1 | xargs -I {} {} generate --schema=./apps/api/src/prisma/schema.prisma

# 2. Меняем владельца ВСЕХ файлов в рабочей директории на созданного пользователя
RUN chown -R nodejs:nodejs /usr/src/app

# 3. Переключаемся на непривилегированного пользователя
USER nodejs

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]