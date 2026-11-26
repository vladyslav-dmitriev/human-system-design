#!/usr/bin/env bash
# Шифрует секреты для прода через Sealed Secrets. Результат (SealedSecret) безопасно коммитить в git:
# расшифровать его может только контроллер в кластере (его ключ лежит у вас на Mac, см. server-bootstrap.sh --backup-key).
#
# Использование:
#   infra/scripts/seal-secrets.sh [HOST]
#       Генерирует случайные пароли и секреты и шифрует app-deps, app-api, app-web в infra/k8s/app-secrets/.
#       Существующие файлы не перезаписывает (--force пересоздаёт с НОВЫМИ паролями: пароли в уже
#       инициализированных томах Postgres и RabbitMQ при этом не меняются, том придётся пересоздать).
#   infra/scripts/seal-secrets.sh --overrides <env-файл> [HOST]
#       Шифрует реальные ключи сторонних сервисов (Stripe, S3/R2, почта, Twilio, reCAPTCHA) из вашего env-файла
#       в app-api-overrides. Подходят только перечисленные в скрипте ключи, пустые значения пропускаются.
#
#   infra/scripts/seal-secrets.sh --r2 [HOST]
#       Спрашивает в терминале ключи Cloudflare R2 (endpoint, бакет, Access Key ID, Secret Access Key; секрет вводится
#       без эха) и шифрует их в postgres-backup-r2. Этот секрет нужен CronJob бэкапа Postgres и хуку восстановления.
#
# Значения паролей и ключей нигде не печатаются и не попадают в аргументы процессов (только через stdin).
# Для шифрования нужен публичный сертификат контроллера: он берётся с сервера по SSH.
set -euo pipefail

SSH_USER="${SSH_USER:-deploy}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT/infra/k8s/app-secrets"
NAMESPACE="app"
DOMAIN="${DOMAIN:-vladyslavdmitriev.com}"

FORCE=false
R2_MODE=false
OVERRIDES_FILE=""
HOST=""
while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=true ;;
    --r2) R2_MODE=true ;;
    --overrides)
      shift
      OVERRIDES_FILE="${1:-}"
      [ -n "$OVERRIDES_FILE" ] || { echo "--overrides требует путь к env-файлу" >&2; exit 1; }
      ;;
    *) HOST="$1" ;;
  esac
  shift
done

if [ -z "$HOST" ]; then
  HOST="$(terraform -chdir="$ROOT/infra/terraform" output -raw ipv4 2>/dev/null || true)"
fi
[ -n "$HOST" ] || { echo "Не удалось определить адрес сервера. Передайте его аргументом." >&2; exit 1; }

for tool in kubeseal openssl python3 ssh; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Не найден $tool" >&2; exit 1; }
done

TMP="$(mktemp -d)"
chmod 700 "$TMP"
trap 'rm -rf "$TMP"' EXIT
CERT="$TMP/cert.pem"

echo "== Сертификат контроллера с $SSH_USER@$HOST"
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$SSH_USER@$HOST" \
  'sudo k3s kubectl get --raw /api/v1/namespaces/kube-system/services/http:sealed-secrets-controller:8080/proxy/v1/cert.pem' >"$CERT"
grep -q "BEGIN CERTIFICATE" "$CERT" || { echo "Не удалось получить сертификат (контроллер Sealed Secrets запущен?)" >&2; exit 1; }

mkdir -p "$OUT_DIR"

gen() { openssl rand -hex 24; } # 48 hex-символов, безопасно для URL

# KEY=VALUE со stdin -> JSON-манифест Secret (имя в $1) -> SealedSecret в файл $2
seal_env() {
  local name="$1" out="$2"
  python3 -I -c '
import json, sys
name = sys.argv[1]
data = {}
for line in sys.stdin.read().splitlines():
    if not line.strip():
        continue
    k, v = line.split("=", 1)
    data[k] = v
json.dump({"apiVersion": "v1", "kind": "Secret",
           "metadata": {"name": name, "namespace": sys.argv[2]},
           "type": "Opaque", "stringData": data}, sys.stdout)
' "$name" "$NAMESPACE" | kubeseal --cert "$CERT" --format yaml >"$out"
  echo "  запечатан $name -> ${out#"$ROOT"/}"
}

can_write() { # файл
  if [ -f "$1" ] && ! $FORCE; then
    echo "  $1 уже есть, пропускаю (--force пересоздаёт)"
    return 1
  fi
  return 0
}

if $R2_MODE; then
  echo "== Ключи R2 для бэкапа Postgres -> postgres-backup-r2"
  [ -t 0 ] || { echo "Нужен интерактивный терминал: значения вводятся вручную" >&2; exit 1; }
  OUT="$OUT_DIR/postgres-backup-r2.yaml"
  can_write "$OUT" || exit 0
  read -r -p "R2 endpoint (https://<id аккаунта>.r2.cloudflarestorage.com): " R2_ENDPOINT
  read -r -p "Бакет для бэкапов [hsd-backups]: " R2_BUCKET
  R2_BUCKET="${R2_BUCKET:-hsd-backups}"
  read -r -p "Access Key ID: " R2_ACCESS_KEY_ID
  read -r -s -p "Secret Access Key (ввод не отображается): " R2_SECRET_ACCESS_KEY
  echo
  case "$R2_ENDPOINT" in https://*) ;; *) echo "endpoint должен начинаться с https://" >&2; exit 1 ;; esac
  if [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ]; then
    echo "Access Key ID и Secret Access Key обязательны" >&2
    exit 1
  fi
  seal_env postgres-backup-r2 "$OUT" <<ENV
R2_ENDPOINT=${R2_ENDPOINT}
R2_BUCKET=${R2_BUCKET}
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
ENV
  unset R2_SECRET_ACCESS_KEY R2_ACCESS_KEY_ID
  echo "Готово: ${OUT#"$ROOT"/} (только шифртекст). Закоммитьте и слейте PR, дальше ArgoCD создаст Secret."
  exit 0
fi

if [ -n "$OVERRIDES_FILE" ]; then
  echo "== Реальные ключи из $OVERRIDES_FILE -> app-api-overrides"
  [ -f "$OVERRIDES_FILE" ] || { echo "Нет файла $OVERRIDES_FILE" >&2; exit 1; }
  OUT="$OUT_DIR/app-api-overrides.yaml"
  python3 -I - "$OVERRIDES_FILE" <<'PY' | seal_env app-api-overrides "$OUT"
import sys
ALLOWED = [
    "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
    "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET_NAME",
    "AWS_S3_ENDPOINT", "AWS_S3_PUBLIC_URL",
    "EMAIL_PROVIDER", "EMAIL_FROM", "SENDGRID_API_KEY", "RESEND_API_KEY",
    "TWILIO_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID",
    "GOOGLE_CAPTCHA_SECRET_KEY",
]
found = {}
with open(sys.argv[1], encoding="utf-8-sig") as f:
    for raw in f:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        if k in ALLOWED and v:
            found[k] = v
if not found:
    sys.exit("В файле нет ни одного подходящего непустого ключа")
for k, v in found.items():
    print(f"{k}={v}")
PY
  echo "Имена ключей в app-api-overrides: смотрите в самом файле (значения зашифрованы)."
  exit 0
fi

echo "== Секреты приложения (namespace $NAMESPACE)"

# Пароли общие для app-deps и app-api (DATABASE_URL и т.д.), поэтому генерируем один раз
PG_PASS="$(gen)"
REDIS_PASS="$(gen)"
RMQ_PASS="$(gen)"
AUTH_SECRET_VAL="$(gen)$(gen)"
INTERNAL_VAL="$(gen)$(gen)"

# Если deps уже есть, а api нет (или наоборот), пароли разошлись бы: требуем пересоздавать всё вместе
if ! $FORCE; then
  existing=0
  for f in app-deps app-api app-web; do [ -f "$OUT_DIR/$f.yaml" ] && existing=$((existing + 1)); done
  if [ "$existing" -eq 3 ]; then
    echo "  все три файла уже есть, ничего не делаю (--force пересоздаёт с новыми паролями)"
    exit 0
  elif [ "$existing" -gt 0 ]; then
    echo "Есть только часть файлов: пароли могут не совпасть. Запустите с --force, чтобы пересоздать все три." >&2
    exit 1
  fi
fi

seal_env app-deps "$OUT_DIR/app-deps.yaml" <<ENV
POSTGRES_PASSWORD=${PG_PASS}
REDIS_PASSWORD=${REDIS_PASS}
RABBITMQ_PASSWORD=${RMQ_PASS}
ENV

# Ключи сторонних сервисов здесь заглушки: реальные значения запечатайте отдельно (--overrides),
# они перекроют заглушки через app-api-overrides (api.overridesSecret).
seal_env app-api "$OUT_DIR/app-api.yaml" <<ENV
DATABASE_URL=postgresql://user:${PG_PASS}@postgres:5432/mydb
REDIS_URL=redis://:${REDIS_PASS}@redis:6379
RABBITMQ_URL=amqp://admin:${RMQ_PASS}@rabbitmq:5672/
JWT_SECRET=$(gen)$(gen)
AUTH_SECRET=${AUTH_SECRET_VAL}
INTERNAL_API_SECRET=${INTERNAL_VAL}
EMAIL_VERIFICATION_SECRET=$(gen)$(gen)
EMAIL_FROM=noreply@${DOMAIN}
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
AWS_REGION=auto
AWS_ACCESS_KEY_ID=placeholder
AWS_SECRET_ACCESS_KEY=placeholder
AWS_S3_BUCKET_NAME=placeholder
SENDGRID_API_KEY=SG.placeholder
RESEND_API_KEY=re_placeholder
TWILIO_SID=ACplaceholder00000000000000000000
TWILIO_AUTH_TOKEN=placeholder
TWILIO_VERIFY_SERVICE_SID=VAplaceholder00000000000000000000
GOOGLE_CAPTCHA_SECRET_KEY=placeholder
ENV

seal_env app-web "$OUT_DIR/app-web.yaml" <<ENV
NEXTAUTH_SECRET=${AUTH_SECRET_VAL}
INTERNAL_API_SECRET=${INTERNAL_VAL}
ENV

echo
echo "Готово. Файлы в ${OUT_DIR#"$ROOT"/} содержат только зашифрованные значения и безопасны для git."
echo "Следующий шаг: закоммитить их и слить PR, затем ArgoCD сам создаст Secret'ы в кластере."
