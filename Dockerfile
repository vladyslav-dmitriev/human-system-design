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
WORKDIR /usr/src/app

# Копируем node_modules из билдера (там лежит tsx)
COPY --from=stage_builder /usr/src/app/node_modules ./node_modules
# Копируем результат сборки
COPY --from=stage_builder /usr/src/app/apps/api/dist ./dist

# Добавляем путь к бинарникам в PATH, чтобы `tsx` стал виден как команда
ENV PATH="/usr/src/app/node_modules/.bin:${PATH}"

EXPOSE 3001

# Теперь команда tsx будет найдена, так как мы добавили её папку в PATH
CMD ["tsx", "dist/main.js"]