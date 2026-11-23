---
name: guard-hook-shell-gotchas
description: guard.py blocks Bash commands that merely mention .env* or prisma migrations paths; use Edit/Write instead, and watch host disk before docker builds
metadata:
  type: feedback
---

Bash commands whose text contains `.env` (except `.env.example`) or `prisma/migrations` (even in a python heredoc or a Dockerfile COPY line) are rejected by the guard hook.

**Why:** hook tokenizes the whole command, not only the targets.
**How to apply:** edit Dockerfile/compose lines mentioning those paths with Edit/Write, not sed/python in Bash. Compose `env_file: ./apps/*/.env` can't be validated with `docker compose config` in a worktree (files are absent); use `docker compose config --services` instead.

Also: the host disk can be nearly full (Docker Desktop VM ~82G); a full monorepo `docker build` (~2 GB per stage) then fails with containerd input/output errors. Check `df -h /System/Volumes/Data` before building and avoid parallel builds.
