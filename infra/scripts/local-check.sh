#!/usr/bin/env bash
# Проверка развёрнутого в minikube приложения без sudo и /etc/hosts: port-forward на Traefik + curl --resolve.
# Код выхода не 0, если хоть одна проверка провалилась.
set -uo pipefail
# shellcheck source=_local-common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_local-common.sh"
require_tools kubectl curl

PORT=8443
API_PORT=3901
BASE="https://$HOST:$PORT"
CURL=(curl -sk --max-time 20 --resolve "$HOST:$PORT:127.0.0.1" --path-as-is)
PASS=0; FAIL=0
PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; rm -f "${BIG:-}" ; }
trap cleanup EXIT

ok()   { PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
fail() { FAIL=$((FAIL+1)); printf '  FAIL  %s  (%s)\n' "$1" "$2"; }

code() { "${CURL[@]}" -o /dev/null -w '%{http_code}' "$@"; }
expect_code() { # описание ожидаемый_код curl-аргументы...
  local d="$1" want="$2"; shift 2
  local got; got="$(code "$@")"
  [ "$got" = "$want" ] && ok "$d -> $got" || fail "$d" "ожидали $want, получили $got"
}
expect_header() { # описание regex  url
  local d="$1" re="$2" url="$3"
  "${CURL[@]}" -D - -o /dev/null "$url" | tr -d '\r' | grep -qiE "$re" && ok "$d" || fail "$d" "нет заголовка $re"
}

log "port-forward traefik:443 -> localhost:$PORT, api:3001 -> localhost:$API_PORT"
"${KUBECTL[@]}" -n traefik port-forward svc/traefik "$PORT:443" >/dev/null 2>&1 & PIDS+=($!)
"${KUBECTL[@]}" -n "$NAMESPACE" port-forward svc/api "$API_PORT:3001" >/dev/null 2>&1 & PIDS+=($!)
for _ in $(seq 1 30); do
  [ "$(code "$BASE/en" 2>/dev/null)" != "000" ] && break; sleep 1
done

log "Маршруты и приложение"
expect_code "web /en" 200 "$BASE/en"
got="$(code "$BASE/")"; case "$got" in 30[1278]) ok "/ редирект -> $got" ;; *) fail "/ редирект" "код $got" ;; esac
expect_code "web /api/auth/csrf" 200 "$BASE/api/auth/csrf"
"${CURL[@]}" -D - -o /dev/null "$BASE/api/auth/csrf" | tr -d '\r' | grep -i '^set-cookie:' | grep -qi 'secure' \
  && ok "/api/auth/csrf: Set-Cookie с Secure" || fail "/api/auth/csrf Set-Cookie" "нет Secure"
expect_code "api через Ingress /api/health (префикс срезан)" 200 "$BASE/api/health"

log "Внутренние пути закрыты (ожидаем 404)"
expect_code "/api/metrics" 404 "$BASE/api/metrics"
expect_code "/api/Metrics" 404 "$BASE/api/Metrics"
expect_code "/api/metrics/" 404 "$BASE/api/metrics/"
expect_code "/api//metrics" 404 "$BASE/api//metrics"
# /apimetrics и /APImetrics - не путь api: идут в web (как location / в nginx), главное, что метрик в ответе нет
for p in /apimetrics /APImetrics; do
  body="$("${CURL[@]}" -L "$BASE$p")"
  case "$body" in
    *"# HELP"*|*process_cpu*) fail "$p" "в ответе метрики Prometheus" ;;
    *) ok "$p не отдаёт метрики api" ;;
  esac
done
expect_code "/api/%6detrics" 404 "$BASE/api/%6detrics"
expect_code "/api/docs" 404 "$BASE/api/docs"
expect_code "/api/docs-json" 404 "$BASE/api/docs-json"
expect_code "GET /api/service-auth/validate" 404 "$BASE/api/service-auth/validate"
expect_code "POST /api/service-auth/validate" 404 -X POST "$BASE/api/service-auth/validate"
expect_code "/api/service-auth/%76alidate" 404 "$BASE/api/service-auth/%76alidate"
got="$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$API_PORT/metrics")"
[ "$got" = "200" ] && ok "контроль: api изнутри /metrics -> 200 (404 снаружи не из-за выключенных метрик)" \
  || fail "контроль: api изнутри /metrics" "получили $got (проверьте ENABLE_METRICS)"

log "Заголовки безопасности на /en"
expect_header "X-Frame-Options: DENY" '^x-frame-options: *deny' "$BASE/en"
expect_header "X-Content-Type-Options: nosniff" '^x-content-type-options: *nosniff' "$BASE/en"
expect_header "Referrer-Policy" '^referrer-policy:' "$BASE/en"
expect_header "Permissions-Policy" '^permissions-policy:' "$BASE/en"
expect_header "CSP frame-ancestors" "^content-security-policy:.*frame-ancestors 'none'" "$BASE/en"
expect_header "CSP-Report-Only" '^content-security-policy-report-only:' "$BASE/en"
expect_header "Strict-Transport-Security" '^strict-transport-security:.*max-age=31536000' "$BASE/en"

log "Лимиты тела запроса"
BIG="$(mktemp)"
head -c 7340032 /dev/zero > "$BIG"   # 7 МБ
expect_code "POST 7 МБ на api (лимит 6m)" 413 -X POST -H 'Content-Type: application/octet-stream' --data-binary "@$BIG" "$BASE/api/health"
head -c 2097152 /dev/zero > "$BIG"   # 2 МБ
expect_code "POST 2 МБ на web (лимит 1m)" 413 -X POST -H 'Content-Type: application/octet-stream' --data-binary "@$BIG" "$BASE/en"

log "NetworkPolicy"
TESTER="np-test-$$"
if "${KUBECTL[@]}" -n "$NAMESPACE" run "$TESTER" --rm -i --restart=Never --quiet --image=postgres:16-alpine \
     --image-pull-policy=IfNotPresent --command -- sh -c 'timeout 5 nc -z postgres 5432' >/dev/null 2>&1; then
  fail "под без разрешённых меток -> postgres:5432" "соединение прошло, политика не работает (CNI без NetworkPolicy?)"
else
  ok "под без разрешённых меток -> postgres:5432 заблокирован (таймаут)"
fi
if "${KUBECTL[@]}" -n "$NAMESPACE" exec deploy/app-api -- node -e \
   'const s=require("net").connect(5432,"postgres");s.setTimeout(5000);s.on("connect",()=>process.exit(0));s.on("timeout",()=>process.exit(1));s.on("error",()=>process.exit(1))' >/dev/null 2>&1; then
  ok "api -> postgres:5432 разрешён"
else
  fail "api -> postgres:5432" "соединение не прошло"
fi

printf '\nИтого: %d PASS, %d FAIL\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
