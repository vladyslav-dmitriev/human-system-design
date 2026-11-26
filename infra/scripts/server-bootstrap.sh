#!/usr/bin/env bash
# Bootstrap прод-сервера (k3s на Hetzner): ставит ArgoCD и применяет GitOps (project + root-app).
# Дальше ArgoCD сам разворачивает всё остальное из git: Sealed Secrets, cert-manager, Traefik-конфиг, ClusterIssuer'ы.
#
# Запускается с вашего Mac, нужен только SSH-доступ к серверу (kubeconfig и туннель не нужны):
# kubectl выполняется на сервере через `ssh ... sudo k3s kubectl`.
#
# Использование:
#   infra/scripts/server-bootstrap.sh [HOST]      bootstrap (HOST по умолчанию берётся из terraform output ipv4)
#   infra/scripts/server-bootstrap.sh --backup-key [HOST]
#                                                 сохранить ключ Sealed Secrets на Mac (один раз, после первого bootstrap)
#
# Скрипт идемпотентен: повторный запуск безопасен.
set -euo pipefail

ARGOCD_CHART_VERSION="10.20.0" # Argo CD v3.6.3
SSH_USER="${SSH_USER:-deploy}"
SEALED_KEY_FILE="${SEALED_KEY_FILE:-$HOME/.config/human-system-design/sealed-secrets-key.yaml}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

MODE="bootstrap"
if [ "${1:-}" = "--backup-key" ]; then
  MODE="backup-key"
  shift
fi

HOST="${1:-}"
if [ -z "$HOST" ]; then
  HOST="$(terraform -chdir="$ROOT/infra/terraform" output -raw ipv4 2>/dev/null || true)"
fi
if [ -z "$HOST" ]; then
  echo "Не удалось определить адрес сервера. Передайте его аргументом: $0 [--backup-key] <host>" >&2
  exit 1
fi

TARGET="$SSH_USER@$HOST"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)

# kubectl на сервере. printf %q экранирует аргументы: ssh склеивает их в одну строку для удалённой оболочки.
rk() {
  local cmd
  cmd="$(printf '%q ' sudo k3s kubectl "$@")"
  ssh "${SSH_OPTS[@]}" "$TARGET" "$cmd"
}

# Ключ Sealed Secrets -> файл на Mac. Из объекта убираем служебные поля (uid, resourceVersion и т.д.),
# чтобы его можно было применить в новом кластере. Приватный ключ нигде не печатается.
backup_key() {
  local dir
  dir="$(dirname "$SEALED_KEY_FILE")"
  mkdir -p "$dir"
  chmod 700 "$dir"
  (
    umask 077
    rk -n kube-system get secret -l sealedsecrets.bitnami.com/sealed-secrets-key -o json |
      python3 -I -c '
import json, sys
src = json.load(sys.stdin)
items = []
for s in src["items"]:
    m = s["metadata"]
    items.append({
        "apiVersion": "v1",
        "kind": "Secret",
        "type": s.get("type", "kubernetes.io/tls"),
        "metadata": {"name": m["name"], "namespace": m["namespace"], "labels": m.get("labels", {})},
        "data": s["data"],
    })
if not items:
    sys.exit("Ключ Sealed Secrets не найден: контроллер ещё не стартовал?")
json.dump({"apiVersion": "v1", "kind": "List", "items": items}, sys.stdout)
' >"$SEALED_KEY_FILE"
  )
  chmod 600 "$SEALED_KEY_FILE"
  echo "Ключ Sealed Secrets сохранён: $SEALED_KEY_FILE"
  echo "Это приватный ключ: не коммитьте его и не отправляйте никому. Сделайте копию в менеджер паролей."
}

if [ "$MODE" = "backup-key" ]; then
  backup_key
  exit 0
fi

echo "== Сервер: $TARGET"

echo "== Жду, пока узел k3s станет Ready"
for _ in $(seq 1 30); do
  if rk wait --for=condition=Ready node --all --timeout=10s >/dev/null 2>&1; then
    break
  fi
  sleep 5
done
rk get nodes

echo "== Ключ Sealed Secrets"
if [ -f "$SEALED_KEY_FILE" ]; then
  echo "Восстанавливаю ключ из $SEALED_KEY_FILE (до старта контроллера)"
  rk apply -f - <"$SEALED_KEY_FILE"
else
  echo "Сохранённого ключа нет: контроллер сгенерирует новый."
  echo "После bootstrap выполните: $0 --backup-key $HOST"
fi

echo "== ArgoCD $ARGOCD_CHART_VERSION (через Helm-контроллер k3s)"
rk apply -f - <<EOF
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: argocd
  namespace: kube-system
spec:
  repo: https://argoproj.github.io/argo-helm
  chart: argo-cd
  version: "${ARGOCD_CHART_VERSION}"
  targetNamespace: argocd
  createNamespace: true
  valuesContent: |-
    # экономим память на одном сервере
    dex:
      enabled: false
    notifications:
      enabled: false
EOF

echo "== Жду ArgoCD (Helm-контроллер скачивает чарт, это 1-3 минуты)"
for _ in $(seq 1 60); do
  if rk -n argocd get deploy argocd-server >/dev/null 2>&1; then
    break
  fi
  sleep 5
done
rk -n argocd rollout status deploy/argocd-server --timeout=300s
rk wait --for=condition=Established crd/applications.argoproj.io --timeout=60s

echo "== GitOps: project и root-app"
rk apply -f - <"$ROOT/infra/argocd/project.yaml"
rk apply -f - <"$ROOT/infra/argocd/root-app.yaml"

echo
echo "== Готово. Приложения ArgoCD:"
rk -n argocd get applications || true
echo
echo "Дальше:"
echo "  1) Сохраните ключ Sealed Secrets (если ещё не сохраняли): $0 --backup-key $HOST"
echo "  2) Доступ к ArgoCD с Mac (держите окно открытым), затем https://localhost:8080 :"
echo "     ssh -L 8080:127.0.0.1:8080 $TARGET 'sudo k3s kubectl -n argocd port-forward svc/argocd-server 8080:443'"
echo "  3) Пароль admin (печатается в вашем терминале):"
echo "     ssh $TARGET \"sudo k3s kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 --decode; echo\""
