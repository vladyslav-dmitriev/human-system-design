FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# 1. Копируем всё содержимое проекта сразу
COPY . .

# 2. Переходим в папку с API
WORKDIR /usr/src/app/apps/api

# 3. Устанавливаем зависимости прямо здесь
# Это гарантирует, что node_modules будет находиться внутри apps/api
RUN npm install

# 4. Генерируем клиент Prisma
# Теперь npx гарантированно найдет prisma в текущем node_modules
RUN npx prisma generate --schema=./src/prisma/schema.prisma

# 5. Билдим
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/main"]