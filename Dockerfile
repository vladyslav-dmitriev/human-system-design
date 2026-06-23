# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
# ... (остальной код прежний) ...
RUN pnpm install --frozen-lockfile
# Генерируем клиента
RUN npx prisma generate --schema=apps/api/src/prisma/schema.prisma

# ... (сборка приложения) ...

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем всё из dist
COPY --from=stage_builder /usr/src/app/apps/api/dist . 
# ВАЖНО: Копируем сгенерированного клиента Prisma
COPY --from=stage_builder /usr/src/app/apps/api/src/prisma/generated/client ./prisma/generated/client
# Копируем node_modules
COPY --from=stage_builder /usr/src/app/node_modules ./node_modules
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./package.json

EXPOSE 3001

CMD ["npx", "tsx", "main.js"]