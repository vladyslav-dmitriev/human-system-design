---
description: Прогнать typecheck, lint и тесты затронутых пакетов и коротко отчитаться
allowed-tools: Bash, Read, Grep, Glob
---

Определи по `git diff main...HEAD` и `git status`, какие пакеты затронуты (`apps/web`, `apps/api`, `packages/*`). Для каждого запусти `typecheck`, `lint` и тесты по командам из `CLAUDE.md`.

Нюансы: в api используй `pnpm --filter api lint:check` (без `--fix`, `lint` в api правит файлы); для `@repo/ui` и `@repo/i18n` запускай `typecheck`, только если скрипт есть.

Не чини ничего сам. Выведи таблицу «команда → результат» и для каждой ошибки файл:строка с одной строкой причины. Если зависимости не установлены (нет `node_modules`), так и скажи, а не выдавай за ошибку кода.
