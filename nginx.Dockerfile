# Закреплённая версия без root: порт задаётся NGINX_PORT (по умолчанию 8080, непривилегированному
# пользователю нельзя 80), поэтому в Kubernetes targetPort 8080. В docker-compose тот же шаблон
# монтируется с NGINX_PORT=80. Официальный entrypoint рендерит templates/*.template в conf.d через envsubst.
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e

ENV NGINX_PORT=8080

COPY nginx/templates/ /etc/nginx/templates/
COPY nginx/snippets/ /etc/nginx/snippets/
