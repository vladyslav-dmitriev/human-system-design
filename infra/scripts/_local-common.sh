# Общие переменные для local-*.sh (подключается через source, сам не исполняется)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${MINIKUBE_PROFILE:-human-system-design}"
NAMESPACE="app"
HOST="myapp.local"
KUBECTL=(kubectl --context "$PROFILE")
HELM=(helm --kube-context "$PROFILE")

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }

require_tools() {
  local missing=()
  for t in "$@"; do command -v "$t" >/dev/null 2>&1 || missing+=("$t"); done
  [ ${#missing[@]} -eq 0 ] || die "не найдены инструменты: ${missing[*]}"
}
