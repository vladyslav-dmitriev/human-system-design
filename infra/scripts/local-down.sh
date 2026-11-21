#!/usr/bin/env bash
# Удаляет локальный кластер minikube (вместе с томами БД). Спрашивает подтверждение; --yes пропускает вопрос.
set -euo pipefail
# shellcheck source=_local-common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_local-common.sh"
require_tools minikube

if [ "${1:-}" != "--yes" ]; then
  printf 'Удалить кластер minikube "%s" вместе со всеми данными (Postgres, Redis, RabbitMQ)? [y/N] ' "$PROFILE"
  read -r answer
  case "$answer" in y|Y|yes|YES) ;; *) echo "Отменено"; exit 1 ;; esac
fi

minikube -p "$PROFILE" delete
