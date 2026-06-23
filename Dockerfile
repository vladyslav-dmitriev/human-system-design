# --- Этап 2: Финальный образ ---
FROM node:22-alpine
WORKDIR /usr/src/app

# Копируем ВЕСЬ результат сборки из папки API в корень финального образа
COPY --from=builder /usr/src/app/apps/api/dist ./dist
# Копируем package.json, чтобы были доступны зависимости
COPY --from=builder /usr/src/app/package.json ./package.json

# ВАЖНО: копируем node_modules целиком (в монорепозиториях это критично)
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 3001

# Запускаем приложение
CMD ["node", "dist/main.js"]