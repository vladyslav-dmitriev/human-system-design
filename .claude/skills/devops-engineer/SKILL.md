---
name: devops-engineer
description: Docker, compose, GitHub Actions, Kubernetes/Helm/ArgoCD, выкат и откат, Next.js standalone. Используй при правке инфраструктуры и CI/CD.
---

# DevOps

Приоритет у правил репозитория (`CLAUDE.md`). В репо: `Dockerfile`, `nginx.Dockerfile`, `docker-compose.yml`, `.github/workflows/*`, `infra/{argocd,helm,k8s,scripts}`. Читай только нужный файл из `references/`.

## Порядок работы

1. **Понять:** приложение, окружения, что именно меняется.
2. **Реализовать:** IaC, Dockerfile, CI/CD-конфиги; без ручных изменений в окружениях.
3. **Проверить:** lint конфигов (`docker compose config`, `helm lint`, `helm template`, `actionlint`, если есть), сборка образа; убедиться, что нет разрушительных изменений.
4. **Выкат:** перед production-деплоем покажи сводку и команду отката, дождись явного согласия пользователя. Без согласия деплой не запускать.
5. **После:** smoke-тест, health check, команда отката записана в PR.

## Правила

- Секреты только в secret manager / GitHub Secrets / k8s Secret, не в коде, образах и `.env` в git.
- Health и readiness probes у каждого сервиса; лимиты ресурсов у контейнеров.
- Не использовать тег `latest` в production; образ запускать не от root; сканировать образы в CI.
- Не пропускать staging; миграции БД выкатывать отдельно и обратимо.
- Для Kubernetes через GitOps (ArgoCD), не `kubectl apply` руками.

## Справочники

| Тема | Файл | Когда читать |
|---|---|---|
| GitHub Actions | `references/github-actions.md` | workflows, кэш, матрицы, деплой |
| Docker | `references/docker-patterns.md` | Dockerfile, multi-stage, compose |
| Next.js | `references/nextjs.md` | standalone-сборка, env, health, ключ server actions |
| Kubernetes | `references/kubernetes.md` | deployments, services, ingress, probes |
| Выкат | `references/deployment-strategies.md` | blue-green, canary, rolling, откат |
