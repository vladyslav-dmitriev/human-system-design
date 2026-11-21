#!/usr/bin/env bash
# Доступ к minikube на https://myapp.local без sudo и без `minikube tunnel`.
# Docker Desktop сам публикует привилегированные порты (как nginx в compose), поэтому маленький
# контейнер с socat слушает 127.0.0.1:80/443 и пересылает трафик на NodePort Traefik в ноде minikube.
# Только 127.0.0.1: из локальной сети приложение не видно.
#
#   bash infra/scripts/local-proxy.sh        # запустить (или перезапустить)
#   bash infra/scripts/local-proxy.sh stop   # остановить
#
# Нужна строка `127.0.0.1 myapp.local` в /etc/hosts. Порты 80/443 не должны быть заняты (compose nginx остановлен).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_local-common.sh"

PROXY_NAME="${PROFILE}-proxy"
# alpine 3.20 (обновляйте digest вместе с тегом)
PROXY_IMAGE="alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc"

docker rm -f "$PROXY_NAME" >/dev/null 2>&1 || true
if [ "${1:-}" = "stop" ]; then
  echo "Прокси $PROXY_NAME остановлен"
  exit 0
fi

require_tools docker minikube kubectl
NODE_IP="$(minikube -p "$PROFILE" ip)"
P80="$("${KUBECTL[@]}" -n traefik get svc traefik -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')"
P443="$("${KUBECTL[@]}" -n traefik get svc traefik -o jsonpath='{.spec.ports[?(@.port==443)].nodePort}')"
[ -n "$P80" ] && [ -n "$P443" ] || die "не нашёл NodePort у svc/traefik (кластер поднят? pnpm k8s:up)"

docker run -d --name "$PROXY_NAME" --restart unless-stopped --network "$PROFILE" \
  -p 127.0.0.1:80:80 -p 127.0.0.1:443:443 "$PROXY_IMAGE" \
  sh -c "apk add --no-cache socat >/dev/null && (socat TCP-LISTEN:80,fork,reuseaddr TCP:$NODE_IP:$P80 & exec socat TCP-LISTEN:443,fork,reuseaddr TCP:$NODE_IP:$P443)" \
  >/dev/null

echo "Прокси $PROXY_NAME: 127.0.0.1:80 -> $NODE_IP:$P80, 127.0.0.1:443 -> $NODE_IP:$P443"
echo "Откройте https://$HOST"
