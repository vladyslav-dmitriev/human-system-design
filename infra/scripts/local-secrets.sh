#!/usr/bin/env bash
# Создаёт Secret'ы для локального minikube: app-deps, app-api, app-web в namespace app.
# Значения генерируются случайно и НЕ печатаются. Существующие Secret'ы не перезаписываются без --force.
# --force пересоздаёт все три с новыми паролями. Внимание: пароль в уже инициализированных томах
# postgres/rabbitmq при этом не меняется, поэтому после --force пересоздавайте и тома (local-down + local-up).
#
# Реальные ключи (Stripe и т.п.) подставьте сами, например:
#   kubectl --context human-system-design -n app patch secret app-api --type merge \
#     -p "{\"stringData\":{\"STRIPE_SECRET_KEY\":\"sk_test_...\",\"STRIPE_WEBHOOK_SECRET\":\"whsec_...\"}}"
#   kubectl --context human-system-design -n app rollout restart deploy/app-api
set -euo pipefail
# shellcheck source=_local-common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_local-common.sh"

FORCE=false
[ "${1:-}" = "--force" ] && FORCE=true

require_tools kubectl openssl base64

"${KUBECTL[@]}" get namespace "$NAMESPACE" >/dev/null 2>&1 || "${KUBECTL[@]}" create namespace "$NAMESPACE" >/dev/null

TMPDIR_SECRETS="$(mktemp -d)"
chmod 700 "$TMPDIR_SECRETS"
trap 'rm -rf "$TMPDIR_SECRETS"' EXIT

gen() { openssl rand -hex 24; }                     # 48 hex-символов, безопасно для URL
exists() { "${KUBECTL[@]}" -n "$NAMESPACE" get secret "$1" >/dev/null 2>&1; }
# Читает ключ из Secret в кластере (значение не печатается, только возвращается в переменную)
get_key() {
  "${KUBECTL[@]}" -n "$NAMESPACE" get secret "$1" -o "jsonpath={.data.$2}" 2>/dev/null | base64 -d 2>/dev/null || true
}
should_create() { $FORCE || ! exists "$1"; }
apply_env_file() { # имя файл
  "${KUBECTL[@]}" -n "$NAMESPACE" create secret generic "$1" --from-env-file="$2" --dry-run=client -o yaml \
    | "${KUBECTL[@]}" apply -f - >/dev/null
  echo "Secret $1: создан/обновлён"
}

# --- app-deps ---
if should_create app-deps; then
  cat > "$TMPDIR_SECRETS/deps.env" <<ENV
POSTGRES_PASSWORD=$(gen)
REDIS_PASSWORD=$(gen)
RABBITMQ_PASSWORD=$(gen)
ENV
  apply_env_file app-deps "$TMPDIR_SECRETS/deps.env"
else
  echo "Secret app-deps уже есть, пропускаю (--force пересоздаёт)"
fi

PG_PASS="$(get_key app-deps POSTGRES_PASSWORD)"
REDIS_PASS="$(get_key app-deps REDIS_PASSWORD)"
RMQ_PASS="$(get_key app-deps RABBITMQ_PASSWORD)"
[ -n "$PG_PASS" ] && [ -n "$REDIS_PASS" ] && [ -n "$RMQ_PASS" ] || die "в Secret app-deps не хватает паролей"

# Общие секреты api и web: берём из уже существующих Secret'ов, иначе генерируем
AUTH_SECRET_VAL=""; INTERNAL_VAL=""
if ! $FORCE; then
  AUTH_SECRET_VAL="$(get_key app-api AUTH_SECRET)"
  [ -n "$AUTH_SECRET_VAL" ] || AUTH_SECRET_VAL="$(get_key app-web NEXTAUTH_SECRET)"
  INTERNAL_VAL="$(get_key app-api INTERNAL_API_SECRET)"
  [ -n "$INTERNAL_VAL" ] || INTERNAL_VAL="$(get_key app-web INTERNAL_API_SECRET)"
fi
[ -n "$AUTH_SECRET_VAL" ] || AUTH_SECRET_VAL="$(gen)$(gen)"
[ -n "$INTERNAL_VAL" ] || INTERNAL_VAL="$(gen)$(gen)"

# --- app-api ---
if should_create app-api; then
  cat > "$TMPDIR_SECRETS/api.env" <<ENV
DATABASE_URL=postgresql://user:${PG_PASS}@postgres:5432/mydb
REDIS_URL=redis://:${REDIS_PASS}@redis:6379
RABBITMQ_URL=amqp://admin:${RMQ_PASS}@rabbitmq:5672/
JWT_SECRET=$(gen)$(gen)
AUTH_SECRET=${AUTH_SECRET_VAL}
INTERNAL_API_SECRET=${INTERNAL_VAL}
EMAIL_VERIFICATION_SECRET=$(gen)$(gen)
EMAIL_FROM=noreply@example.test
STRIPE_SECRET_KEY=sk_test_local_placeholder
STRIPE_WEBHOOK_SECRET=whsec_local_placeholder
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=local-placeholder
AWS_SECRET_ACCESS_KEY=local-placeholder
AWS_S3_BUCKET_NAME=local-placeholder
SENDGRID_API_KEY=SG.local-placeholder
RESEND_API_KEY=re_local_placeholder
TWILIO_SID=ACloc00000000000000000000000000000
TWILIO_AUTH_TOKEN=local-placeholder
TWILIO_VERIFY_SERVICE_SID=VAloc00000000000000000000000000000
GOOGLE_CAPTCHA_SECRET_KEY=local-placeholder
ENV
  apply_env_file app-api "$TMPDIR_SECRETS/api.env"
else
  echo "Secret app-api уже есть, пропускаю"
fi

# --- app-web ---
if should_create app-web; then
  cat > "$TMPDIR_SECRETS/web.env" <<ENV
NEXTAUTH_SECRET=${AUTH_SECRET_VAL}
INTERNAL_API_SECRET=${INTERNAL_VAL}
ENV
  apply_env_file app-web "$TMPDIR_SECRETS/web.env"
else
  echo "Secret app-web уже есть, пропускаю"
fi
