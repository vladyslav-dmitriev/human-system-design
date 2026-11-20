---
description: Прогнать typecheck, lint и тесты затронутых пакетов и коротко отчитаться
allowed-tools: Bash, Read, Grep, Glob
---

Определи по `git diff main...HEAD` и `git status`, какие пакеты затронуты (`apps/web`, `apps/api`, `packages/*`). Для каждого запусти команды из `CLAUDE.md`:

- web: `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web test:run`
- api: `pnpm --filter api typecheck`, `pnpm --filter api lint:check` (без `--fix`, `lint` в api правит файлы), `pnpm --filter api test`
- ui / i18n: `pnpm --filter @repo/ui typecheck`, `pnpm --filter @repo/i18n typecheck`, если скрипт есть

Не чини ничего сам. Выведи таблицу «команда → результат» и для каждой ошибки файл:строка с одной строкой причины. Если зависимости не установлены (нет `node_modules`), так и скажи, а не выдавай за ошибку кода.
