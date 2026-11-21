# Закреплённая версия без root: слушает 8080, поэтому за ним нужен маппинг портов 80->8080
# (в Kubernetes - targetPort 8080). Конфиг тот же, что монтируется в docker-compose.
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e

COPY nginx/conf.d/ /etc/nginx/conf.d/
