#!/usr/bin/env bash
# PreToolUse (Edit|Write): запрещает правку уже закоммиченных миграций Prisma.
# Новую миграцию создают через `prisma migrate dev --name <name>`.
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
case "$file" in
  */prisma/migrations/*)
    root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
    rel=${file#"$root"/}
    if git -C "$root" ls-files --error-unmatch -- "$rel" >/dev/null 2>&1; then
      echo "Заблокировано: $rel уже в git. Применённые миграции Prisma не редактируются; создай новую через 'prisma migrate dev --name <name>'." >&2
      exit 2
    fi
    ;;
esac
exit 0
