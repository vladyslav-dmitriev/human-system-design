#!/usr/bin/env bash
# Поднимает (или обновляет) приложение в локальном minikube. Идемпотентен: повторный запуск пересобирает образы
# и делает helm upgrade.
#
#   MINIKUBE_CPUS=3 MINIKUBE_MEMORY=4000 infra/scripts/local-up.sh
#
# Системные изменения (sudo, /etc/hosts, доверие к сертификату) скрипт не делает, он только подсказывает их в конце.
set -euo pipefail
# shellcheck source=_local-common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_local-common.sh"

CPUS="${MINIKUBE_CPUS:-3}"
MEMORY="${MINIKUBE_MEMORY:-4000}" # МБ; Docker Desktop должен иметь больше (проверьте Settings -> Resources)
TRAEFIK_CHART_VERSION="42.4.1"    # Traefik v3.7.x, чарт https://traefik.github.io/charts
API_IMAGE="human-system-design-api:local"
WEB_IMAGE="human-system-design-web:local"
CHARTS="$PROJECT_ROOT/infra/helm"

require_tools docker minikube kubectl helm openssl
docker info >/dev/null 2>&1 || die "Docker не запущен"

# --- 0. Образы: собираем на хосте ДО старта кластера (в Docker Desktop с ~5 ГБ памяти сборка next и minikube вместе не помещаются) ---
log "Сборка образов (на хосте)"
docker build --target prod -t "$API_IMAGE" "$PROJECT_ROOT"
docker build --target web -t "$WEB_IMAGE" \
  --build-arg "NEXT_PUBLIC_API_CLIENT_URL=https://${HOST}/api" \
  --build-arg "NEXT_PUBLIC_API_SERVER_URL=http://api:3001" \
  "$PROJECT_ROOT"
# --- 1. Кластер ---
if minikube -p "$PROFILE" status >/dev/null 2>&1; then
  log "minikube '$PROFILE' уже запущен"
else
  log "Запускаю minikube '$PROFILE' (cpus=$CPUS, memory=${MEMORY}mb, cni=calico)"
  minikube -p "$PROFILE" start --driver=docker --cni=calico --cpus="$CPUS" --memory="${MEMORY}mb"
fi

# --- 2. Traefik (ingress-контроллер, как в k3s). Service LoadBalancer 80/443 и IngressClass traefik - значения чарта по умолчанию ---
log "Traefik $TRAEFIK_CHART_VERSION"
"${HELM[@]}" upgrade --install traefik traefik --repo https://traefik.github.io/charts --version "$TRAEFIK_CHART_VERSION" \
  --namespace traefik --create-namespace \
  --set resources.requests.cpu=50m --set resources.requests.memory=64Mi --set resources.limits.memory=192Mi \
  --wait --timeout 5m

# --- 3. Загрузка образов в кластер ---
log "Загрузка образов в minikube"
minikube -p "$PROFILE" image load "$API_IMAGE"
minikube -p "$PROFILE" image load "$WEB_IMAGE"
# Тег local не меняется, поэтому id образов уходит в аннотацию подов: при новой сборке helm пересоздаёт поды
IMAGE_IDS="$(docker image inspect --format '{{ .Id }}' "$API_IMAGE" "$WEB_IMAGE" | tr -d '\n' | shasum | cut -c1-16)"

# --- 4. Namespace, Secret'ы, TLS ---
"${KUBECTL[@]}" get namespace "$NAMESPACE" >/dev/null 2>&1 || "${KUBECTL[@]}" create namespace "$NAMESPACE"

log "Secret'ы (существующие не трогаются)"
"$(dirname "${BASH_SOURCE[0]}")/local-secrets.sh"

if "${KUBECTL[@]}" -n "$NAMESPACE" get secret app-tls >/dev/null 2>&1; then
  log "TLS Secret app-tls уже есть"
else
  log "Самоподписанный сертификат для $HOST"
  TLS_DIR="$(mktemp -d)"
  trap 'rm -rf "$TLS_DIR"' EXIT
  cat > "$TLS_DIR/openssl.cnf" <<CNF
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = $HOST
[v3]
subjectAltName = DNS:$HOST
basicConstraints = CA:FALSE
CNF
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 -keyout "$TLS_DIR/tls.key" -out "$TLS_DIR/tls.crt" \
    -config "$TLS_DIR/openssl.cnf" 2>/dev/null
  "${KUBECTL[@]}" -n "$NAMESPACE" create secret tls app-tls --cert="$TLS_DIR/tls.crt" --key="$TLS_DIR/tls.key"
fi

# --- 5. Helm: сначала зависимости, потом приложение ---
log "helm: deps"
"${HELM[@]}" upgrade --install deps "$CHARTS/deps" --namespace "$NAMESPACE" --wait --timeout 5m

log "helm: app (миграции идут Job'ом pre-install/pre-upgrade)"
"${HELM[@]}" upgrade --install app "$CHARTS/app" --namespace "$NAMESPACE" \
  -f "$CHARTS/app/values.yaml" -f "$CHARTS/app/values-local.yaml" \
  --set-string "podAnnotations.local-image-ids=$IMAGE_IDS" \
  --wait --timeout 10m

log "Готово"
"${KUBECTL[@]}" -n "$NAMESPACE" get pods
cat <<MSG

Дальше (один раз, вручную):
  1. Добавьте в /etc/hosts:   127.0.0.1 $HOST
  2. В ОТДЕЛЬНОМ терминале запустите туннель (просит sudo, нужен для портов 80/443):
       minikube -p $PROFILE tunnel
  3. Откройте https://$HOST
     Сертификат самоподписанный: браузер предупредит. Чтобы доверять, можно выпустить его через mkcert
     (mkcert -install меняет системное хранилище, скрипт этого не делает).
  Быстрая проверка без sudo и /etc/hosts:  pnpm k8s:check
MSG
