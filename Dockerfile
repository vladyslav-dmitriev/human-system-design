# --- Этап 1: Сборка ---
FROM node:22-alpine AS stage_builder
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile

# Собираем проект
WORKDIR /usr/src/app/apps/api
RUN pnpm run build

# --- Этап 2: Финальный образ ---
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Копируем файлы, необходимые для работы pnpm и запуска
COPY --from=stage_builder /usr/src/app/package.json ./package.json
COPY --from=stage_builder /usr/src/app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=stage_builder /usr/src/app/apps/api/package.json ./apps/api/package.json
COPY --from=stage_builder /usr/src/app/apps/api/dist ./apps/api/dist

# Устанавливаем зависимости в финальный образ (включая devDependencies, где лежит tsx)
# Это единственный способ гарантировать, что 'tsx' появится в PATH корректно
RUN pnpm install --frozen-lockfile

# Указываем рабочую папку, где лежит скомпилированный main.js
WORKDIR /usr/src/app/apps/api

EXPOSE 3001

# Теперь tsx будет найден, так как pnpm корректно настроил PATH в этом окружении
CMD ["tsx", "dist/main.js"]