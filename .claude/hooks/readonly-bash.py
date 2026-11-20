#!/usr/bin/env python3
"""PreToolUse (Bash) для read-only агентов (reviewer, security, architect).

Пропускает только команды из белого списка: чтение репозитория (git, ls, cat,
grep, rg, find без -exec) и проверки (pnpm typecheck / test / lint / audit).
Цепочки через && || ; | разрешены, если каждая часть из белого списка.
Запрещены: редиректы, подстановки, запись, чтение .env*. Блокировка: exit 2.
"""
import json, re, shlex, sys

def deny(msg):
    print(f"Заблокировано read-only хуком: {msg}", file=sys.stderr)
    sys.exit(2)

try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")
except Exception:
    deny("не удалось разобрать вход хука")

if "\n" in cmd or "`" in cmd or "$(" in cmd or "<(" in cmd:
    deny("переводы строк и подстановки команд запрещены")

lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
lex.whitespace_split = True
try:
    tokens = list(lex)
except ValueError as e:
    deny(f"не разобрать команду ({e})")

SEP = {";", "&&", "||", "|"}
segments, cur = [], []
for t in tokens:
    if t in SEP:
        segments.append(cur); cur = []
    elif set(t) <= set("&;|<>()") and t:
        deny(f"оператор {t!r} не разрешён")  # редиректы, фон, подоболочки
    else:
        cur.append(t)
segments.append(cur)

PLAIN = {"ls", "cat", "head", "tail", "wc", "grep", "rg", "tree", "pwd", "sort",
         "uniq", "cut", "jq", "diff", "file", "stat", "which", "basename", "dirname"}
GIT = {"status", "diff", "log", "show", "blame", "ls-files", "rev-parse", "branch",
       "merge-base", "shortlog", "grep", "cat-file", "ls-tree", "describe", "remote"}
PNPM_SCRIPTS = {"typecheck", "test", "test:run", "test:unit", "lint", "lint:check", "audit"}
ENV = re.compile(r"(^|/)\.env(?!\.example$)[^/]*$")

for argv in segments:
    if not argv:
        deny("пустая часть команды")
    name, args = argv[0], argv[1:]
    for a in args:
        if ENV.search(a):
            deny("чтение .env* запрещено (кроме .env.example)")
    if name in PLAIN:
        if name == "sort" and any(a == "-o" or a.startswith("--output") for a in args):
            deny("sort -o пишет в файл")
    elif name == "find":
        if any(a in {"-exec", "-execdir", "-ok", "-okdir", "-delete"} or a.startswith("-fprint") or a.startswith("-fls") for a in args):
            deny("find с -exec/-delete/-fprint")
    elif name == "git":
        if not args or args[0] not in GIT:
            deny(f"git {args[0] if args else ''}: разрешены только {sorted(GIT)}")
        if any(a.startswith("--output") or a in {"-o", "-D", "-d", "-m", "-M", "-c", "-C"} and args[0] == "branch" for a in args):
            deny("git: запись или изменение запрещены")
        if args[0] == "remote" and any(a in {"add", "remove", "rm", "set-url", "rename"} for a in args[1:]):
            deny("git remote изменяет конфиг")
    elif name == "pnpm":
        rest = args[:]
        if rest[:1] == ["--filter"] and len(rest) >= 2:
            filt, rest = rest[1], rest[2:]
        else:
            filt = None
        if rest[:1] == ["-r"]:
            rest = rest[1:]
        if not rest or rest[0] not in PNPM_SCRIPTS:
            deny(f"pnpm: разрешены только {sorted(PNPM_SCRIPTS)}")
        if rest[0] == "lint" and filt == "api":
            deny("pnpm --filter api lint запускает eslint --fix и правит файлы; используй lint:check")
        if any(a in {"--fix", "-u", "--update", "--update-snapshot"} for a in rest[1:]):
            deny("флаги записи (--fix, -u) запрещены")
    else:
        deny(f"команда {name!r} вне белого списка")
sys.exit(0)
