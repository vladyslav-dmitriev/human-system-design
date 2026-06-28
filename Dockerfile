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

COPY --from=stage_builder /usr/src/app/package.json ./
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=stage_builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json
COPY --from=stage_builder /usr/src/app/apps/api/src ./apps/api/src
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

RUN pnpm install --frozen-lockfile

# Генерация клиента в node_modules
RUN cd apps/api && npx prisma generate --schema=./src/prisma/schema.prisma

# ПРИНУДИТЕЛЬНОЕ копирование в dist для вашего импорта
RUN mkdir -p /usr/src/app/apps/api/dist/prisma/generated/client && \
    cp -r $(find /usr/src/app/node_modules/.prisma/client -maxdepth 1)/* /usr/src/app/apps/api/dist/prisma/generated/client/

RUN pnpm prune --prod

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]