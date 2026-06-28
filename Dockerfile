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

RUN pnpm install --frozen-lockfile

# Генерация и умное копирование
RUN cd apps/api && npx prisma generate --schema=./src/prisma/schema.prisma
RUN CLIENT_PATH=$(find /usr/src/app -name "client" | grep ".prisma/client" | head -n 1) && \
    mkdir -p /usr/src/app/apps/api/dist/prisma/generated/client && \
    cp -r $CLIENT_PATH/* /usr/src/app/apps/api/dist/prisma/generated/client/

RUN pnpm prune --prod

COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]