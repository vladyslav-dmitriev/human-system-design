#!/usr/bin/env bash
# PostToolUse (Edit|Write): форматирует изменённый файл prettier'ом проекта.
# Конфиг prettier подхватывается по пути файла (у apps/api свой .prettierrc,
# у остальных дефолты). Никогда не блокирует работу: при любой проблеме exit 0.
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

case "$file" in
  */node_modules/*|*/.next/*|*/dist/*|*/coverage/*|*/prisma/generated/*|*/prisma/migrations/*|*/.claude/skills/*|*/playwright-report/*|*/test-results/*|*/pnpm-lock.yaml) exit 0 ;;
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css) ;;
  *) exit 0 ;;
esac

root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
bin="$root/node_modules/.bin/prettier"
[ -x "$bin" ] || exit 0

"$bin" --write --log-level silent "$file" >/dev/null 2>&1 || true
exit 0
