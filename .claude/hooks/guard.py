#!/usr/bin/env python3
"""PreToolUse (Bash|Read|Grep|Edit|Write): закрывает дыры, которые не ловит permissions.deny.

deny-правила сверяют префикс команды, и их обходят (`rm -fr`, `head .env`,
`kubectl -n x apply`). Здесь разбор по токенам. Блокировка: exit 2.
Это защита от случайностей и ошибок агента, а не sandbox: `bash -c "$X"` и
сборка путей из переменных она не поймает.
"""
import fnmatch, json, os, re, shlex, sys

def deny(msg):
    print(f"Заблокировано guard-хуком: {msg}", file=sys.stderr)
    sys.exit(2)

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
tool, ti = data.get("tool_name", ""), data.get("tool_input", {}) or {}

ENV = re.compile(r"(^|/)\.env(?!\.example$)[^/]*$")
ENV_GLOBS = (".env", ".env.local", ".env.production", ".env.development")

def is_env(path: str) -> bool:
    base = os.path.basename(path)
    if ENV.search(path):
        return True
    if any(c in base for c in "*?[") and base.startswith("."):
        return any(fnmatch.fnmatch(g, base) for g in ENV_GLOBS)
    return False

if tool in {"Read", "Edit", "Write", "Grep"}:
    for p in (ti.get("file_path"), ti.get("path"), ti.get("glob")):
        if p and is_env(p):
            deny(f"{tool} .env* запрещён (кроме .env.example)")
    sys.exit(0)

if tool != "Bash":
    sys.exit(0)

cmd = ti.get("command", "")
lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
lex.whitespace_split = True
try:
    tokens = list(lex)
except ValueError:
    if re.search(r"(^|[\s/=])\.env(?!\.example\b)", cmd):
        deny("упоминание .env* в неразбираемой команде")
    sys.exit(0)

SEP = {";", "&&", "||", "|", "&"}
segments, cur, redirects = [], [], []
for t in tokens:
    if t in SEP:
        segments.append(cur); cur = []
    elif t and set(t) <= set("<>()"):
        redirects.append(t); cur.append(t)
    else:
        cur.append(t)
segments.append(cur)

def flags(args):
    short = "".join(a[1:] for a in args if re.fullmatch(r"-[A-Za-z]+", a))
    long_ = {a for a in args if a.startswith("--")}
    return short, long_

MIGR = "prisma/migrations"
WRITERS = {"sed", "perl", "tee", "rm", "mv", "cp", "truncate", "dd", "ed", "python", "python3", "node", "install", "chmod"}

for argv in segments:
    if not argv:
        continue
    name = os.path.basename(argv[0])
    args = argv[1:]

    for a in argv:
        if is_env(a.split("=", 1)[-1]):
            deny("доступ к .env* из shell запрещён (кроме .env.example)")

    if name == "rm":
        s, l = flags(args)
        if ("r" in s.lower() or "--recursive" in l) and ("f" in s or "--force" in l):
            deny("rm с рекурсивным и force-флагами (в любом порядке)")

    if name == "git":
        verbs = [a for a in args if not a.startswith("-")]
        v = verbs[0] if verbs else ""
        s, l = flags(args)
        if v == "push":
            if l & {"--force", "--force-with-lease", "--force-if-includes", "--mirror", "--delete"} \
               or "f" in s or "d" in s or any(a.startswith("+") or a.startswith("--force-with-lease=") for a in args):
                deny("git push --force / +ref / --delete / --mirror")
        if v == "reset" and "--hard" in args:
            deny("git reset --hard")
        if v == "clean" and ("f" in s or "--force" in l):
            deny("git clean -f удаляет неотслеживаемые файлы")
        if v == "checkout" and ("--" in args and "." in args):
            deny("git checkout -- . отбрасывает все правки")

    if name in {"kubectl", "oc"} and {"apply", "delete", "replace", "patch", "drain", "cordon"} & set(args):
        deny("kubectl apply/delete/replace/patch меняют кластер")
    if name in {"terraform", "tofu"} and {"apply", "destroy"} & set(args):
        deny("terraform apply/destroy")
    if name == "docker" or name == "docker-compose":
        s, l = flags(args)
        if "down" in args and ("v" in s or "--volumes" in l):
            deny("docker compose down -v удаляет тома с данными")
        if "volume" in args and ({"rm", "prune"} & set(args)):
            deny("docker volume rm/prune")
        if "prune" in args and "--volumes" in l:
            deny("docker system prune --volumes")
    if "migrate" in args and "reset" in args:
        deny("prisma migrate reset: только после подтверждения пользователя")
    if "--force-reset" in args:
        deny("prisma db push --force-reset удаляет данные")

    touches_migr = any(MIGR in a for a in argv)
    if touches_migr and name in WRITERS:
        deny("правка prisma/migrations через shell; новые миграции только через prisma migrate dev")

if redirects and MIGR in cmd:
    deny("запись в prisma/migrations через редирект")
sys.exit(0)
