# Используем официальный образ Nginx
FROM nginx:alpine

# Удаляем стандартный конфиг
RUN rm /etc/nginx/conf.d/default.conf

# Копируем ваш настроенный конфиг
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx слушает порт 80, Railway автоматически поймет это
EXPOSE 80