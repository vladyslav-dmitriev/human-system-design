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
# Публичные ключи web (reCAPTCHA site key, Stripe pk_test, ...) инлайнятся в бандл при сборке.
# `--build-arg NAME` без значения берёт его из окружения, если переменная задана (иначе пусто).
# URL API задаём явно: они должны указывать на Ingress minikube, а не на compose.
if [ -z "${NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY:-}" ]; then
  printf '\nВНИМАНИЕ: NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY не задан: web соберётся без reCAPTCHA,\n' >&2
  printf 'регистрация и вход в кластере работать не будут. Как передать ключи: docs/k8s-deploy.md, фаза 3.\n\n' >&2
fi
docker build --target web -t "$WEB_IMAGE" \
  --build-arg "NEXT_PUBLIC_API_CLIENT_URL=https://${HOST}/api" \
  --build-arg "NEXT_PUBLIC_API_SERVER_URL=http://api:3001" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLIC_KEY \
  --build-arg NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY \
  --build-arg NEXT_PUBLIC_CLOUDFLARE_SITE_KEY \
  --build-arg NEXT_PUBLIC_AMPLITUDE_API_KEY \
  --build-arg NEXT_PUBLIC_GROWTHBOOK_API_HOST \
  --build-arg NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY \
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
# Уникальный тег на каждую сборку (local-<id образа>): `minikube image load` с драйвером docker не перезаписывает
# образ с уже существующим тегом (даже с --overwrite), и под молча запускался бы со старой сборкой.
# Новый тег заодно сам пересоздаёт поды при helm upgrade.
image_tag() { echo "local-$(docker image inspect --format '{{ .Id }}' "$1" | sed 's/^sha256://' | cut -c1-12)"; }
API_TAG="$(image_tag "$API_IMAGE")"
WEB_TAG="$(image_tag "$WEB_IMAGE")"
docker tag "$API_IMAGE" "${API_IMAGE%:*}:$API_TAG"
docker tag "$WEB_IMAGE" "${WEB_IMAGE%:*}:$WEB_TAG"
minikube -p "$PROFILE" image load "${API_IMAGE%:*}:$API_TAG"
minikube -p "$PROFILE" image load "${WEB_IMAGE%:*}:$WEB_TAG"

# --- 4. Namespace, Secret'ы, TLS ---
"${KUBECTL[@]}" get namespace "$NAMESPACE" >/dev/null 2>&1 || "${KUBECTL[@]}" create namespace "$NAMESPACE"

log "Secret'ы (существующие не трогаются)"
"$(dirname "${BASH_SOURCE[0]}")/local-secrets.sh"

# REGENERATE_TLS=1 перевыпускает сертификат (например, после установки mkcert).
if [ "${REGENERATE_TLS:-}" = "1" ]; then
  "${KUBECTL[@]}" -n "$NAMESPACE" delete secret app-tls --ignore-not-found >/dev/null
fi

if "${KUBECTL[@]}" -n "$NAMESPACE" get secret app-tls >/dev/null 2>&1; then
  log "TLS Secret app-tls уже есть (перевыпуск: REGENERATE_TLS=1 pnpm k8s:up)"
elif command -v mkcert >/dev/null 2>&1; then
  # mkcert выпускает сертификат от своего локального CA. Чтобы браузер ему доверял, пользователь один раз
  # сам выполняет `mkcert -install` (меняет системное хранилище доверия, скрипт этого не делает).
  log "Сертификат mkcert для $HOST"
  TLS_DIR="$(mktemp -d)"
  trap 'rm -rf "$TLS_DIR"' EXIT
  mkcert -cert-file "$TLS_DIR/tls.crt" -key-file "$TLS_DIR/tls.key" "$HOST" >/dev/null 2>&1
  "${KUBECTL[@]}" -n "$NAMESPACE" create secret tls app-tls --cert="$TLS_DIR/tls.crt" --key="$TLS_DIR/tls.key"
else
  log "Самоподписанный сертификат для $HOST (для доверенного: brew install mkcert && mkcert -install, затем REGENERATE_TLS=1 pnpm k8s:up)"
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
  --set-string "api.image.tag=$API_TAG" --set-string "web.image.tag=$WEB_TAG" \
  --wait --timeout 10m

log "Готово"
"${KUBECTL[@]}" -n "$NAMESPACE" get pods
cat <<MSG

Дальше (один раз, вручную):
  1. Добавьте в /etc/hosts:   127.0.0.1 $HOST
  2. Доступ на 80/443 без sudo:  pnpm k8s:proxy   (или в отдельном терминале: minikube -p $PROFILE tunnel, просит sudo)
  3. Откройте https://$HOST
     Без mkcert сертификат самоподписанный, и браузер его не примет. Доверенный сертификат:
       brew install mkcert && mkcert -install   (меняет системное хранилище доверия, делаете вы)
       REGENERATE_TLS=1 pnpm k8s:up
  Быстрая проверка без sudo и /etc/hosts:  pnpm k8s:check
MSG
