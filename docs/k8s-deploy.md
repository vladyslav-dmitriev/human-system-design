# Kubernetes: локально через minikube, на сервере через k3s

Статус: черновик плана, ждёт утверждения. Обновлено 2026-11-21.

## Цель

- **Разработка** — как сейчас, через `docker compose` (hot reload, volume, `pnpm dev`).
- **Деплой** — Kubernetes. Один и тот же Helm-чарт работает в двух местах:
  - локально в **minikube**, чтобы проверить деплой перед пушем;
  - на сервере в **k3s** (лёгкий Kubernetes для одного сервера), где живёт приложение.
- Бюджет пет-проекта: 0 € или до ~7 € в месяц.

## Окружения

| | compose (разработка) | minikube (проверка деплоя) | k3s на сервере (прод) |
|---|---|---|---|
| Запуск | `docker compose up -d` | `pnpm k8s:up` | ArgoCD сам подтягивает `main` |
| Код | volume + dev-сервер | prod-образ, собранный в minikube | prod-образ из GHCR |
| Конфиг | `apps/*/.env` | Secret из локального `.env` (скрипт) | Sealed Secrets из git |
| Маршруты | `nginx/templates/default.conf.template` | Ingress (Traefik) | Ingress (Traefik) + TLS |
| Хост | `myapp.local` | `myapp.local` | свой домен или `<ip>.sslip.io` |
| Values | — | `values.yaml` + `values-local.yaml` | `values.yaml` + `values-prod.yaml` |

## Решения

1. **На сервере k3s, а не minikube.** minikube рассчитан на локальную машину. k3s ставится одной командой, держит нагрузку и потребляет мало памяти. Для Helm-чарта разницы нет.
2. **Один чарт, разные values.** Всё общее лежит в `values.yaml`, отличия только в `values-local.yaml` и `values-prod.yaml` (образ, хост, TLS, ресурсы, число реплик). Текущий `values-dev.yaml` переименовать в `values-local.yaml`.
3. **Ingress через Traefik, а не ingress-nginx.** Проект ingress-nginx в 2026 году перестал развиваться (Kubernetes объявил о его retirement). Traefik уже встроен в k3s, в minikube он ставится Helm-чартом. Так локально и на сервере будет одинаково. ArgoCD-приложение `ingress-nginx` убрать.
4. **Образы в GHCR.** Репозиторий публичный, так что хранение и скачивание бесплатные. Если сервер на ARM (Oracle), собирать multi-arch `linux/amd64,linux/arm64`.
5. **ArgoCD только на сервере.** Он сам забирает изменения из git, поэтому API кластера не нужно открывать в интернет, а GitHub Actions не нужен kubeconfig. Локально ArgoCD не ставим: `helm upgrade --install` проще, и не нужно пушить, чтобы проверить изменения.
6. **Секреты на сервере через Sealed Secrets.** В git лежат только зашифрованные `SealedSecret`, расшифровать их может только контроллер в кластере. Локально секреты создаёт скрипт из `.env`, и запускает его пользователь сам. Пустые файлы `infra/helm/secrets/*` удалить.
7. **Обновление тега образа.** CI собирает образ с тегом `sha-<commit>` и коммитит этот тег в `values-prod.yaml` с пометкой `[skip ci]`, после чего ArgoCD выкатывает новую версию. Внешний gitops-репозиторий (`your-org/fullstack-gitops` в `helm.yml`) не нужен.
8. **БД.** Postgres, Redis и RabbitMQ работают в кластере на томах (на k3s это встроенный `local-path`). Бэкап Postgres делает CronJob с `pg_dump` в бесплатное S3-хранилище (Cloudflare R2 или Oracle Object Storage). Образы Bitnami проверить: в 2025 году Bitnami убрал бесплатные образы из основного репозитория. Если они не скачиваются, использовать официальные образы `postgres`, `redis`, `rabbitmq` (простой StatefulSet) или оператор CloudNativePG для Postgres.
9. **Мониторинг (kube-prometheus-stack) необязателен.** На 4 GB он не поместится вместе с приложением. Включать только на сервере, где 8 GB и больше.

## Где взять сервер

| Вариант | Ресурсы | Цена | Минусы |
|---|---|---|---|
| **Oracle Cloud Always Free** (Ampere A1) | 2 OCPU, 12 GB RAM, ARM | 0 € | ARM, поэтому нужны arm64-образы. Свободных мощностей в регионе часто нет («out of host capacity»). В 2026 году лимит урезали вдвое, и Oracle может менять условия дальше. Нужна карта для верификации. |
| **Hetzner CX23** | 2 vCPU, 4 GB RAM, x86 | ~6 €/мес с IPv4 | 4 GB впритык, без мониторинга. Тариф бывает распродан. |
| **Hetzner CAX11** | 2 vCPU, 4 GB RAM, ARM | ~6.5 €/мес с IPv4 | Тоже ARM. |

Решение (2026-11-21): Oracle не используем. Сервер x86 (Hetzner CX23 для постоянного прода; вариант с AWS EKS на время занятий ещё обсуждается), поэтому CI собирает только `linux/amd64`. Если позже понадобится ARM, добавить `linux/arm64` в `docker.yml`.

Домен: бесплатно через `<ip>.sslip.io`, с ним работает Let's Encrypt HTTP-01. Свой домен стоит примерно 10 $ в год.

## Фазы

### Фаза 0. Порядок в compose (devops)
- Многоэтапный `Dockerfile`: стадии `dev` (для compose, `build.target: dev`), `api` и `web` (prod).
- pgadmin и label-backup вынести в профиль `tools` (`docker compose --profile tools up`).
- Поведение compose для разработки не меняется.

### Фаза 1. Образы (devops + frontend)
- frontend: `output: 'standalone'` в `apps/web/next.config.js`.
- devops: prod-стадия для web. Облегчить api-образ: сейчас в финальный образ копируется весь builder.
- devops: `docker.yml` собирает api (target `prod`) и web (target `web`), `linux/amd64`, тег `sha-<полный коммит>`, публикует в `ghcr.io/vladyslav-dmitriev/human-system-design-api` и `human-system-design-web`.
- devops: убрать или исправить `release.yml`, он ссылается на несуществующий `apps/*/Dockerfile` и `your-org`.

### Фаза 2. Helm-чарт приложения (devops, backend по health-эндпоинту)
- Заменить шаблонный `infra/helm/app` (сейчас там nginx из `helm create`):
  - Deployment и Service для `api` (3001) и `web` (3000);
  - ConfigMap с обычными переменными и ссылка на Secret с секретами (имена ключей как в `.env.example`);
  - Job `prisma migrate deploy` как Helm hook `pre-install,pre-upgrade`;
  - probes: backend добавляет `GET /health`, если его нет;
  - Ingress с правилами из nginx-шаблона: `/api/auth` → web, `/api` → api со срезанием префикса, `/api/metrics`, `/api/service-auth/validate` и `/api/docs` → 404, `/` → web;
  - ServiceMonitor включается флагом, по умолчанию выключен.
- Зависимости: Postgres, Redis и RabbitMQ. RabbitMQ сейчас нет вообще.
- CI: `helm lint` и `helm template` с обоими values-файлами.

### Фаза 3. Локальный minikube (devops) - реализовано
Команды (корневой `package.json`):

| Команда | Что делает |
|---|---|
| `pnpm k8s:up` / `pnpm k8s:deploy` | `infra/scripts/local-up.sh`: сборка образов на хосте, старт кластера (если не запущен), Traefik, Secret'ы, TLS, `helm upgrade --install` для `deps`, затем `app`. Повторный запуск пересобирает образы и обновляет релиз |
| `pnpm k8s:secrets [-- --force]` | `local-secrets.sh`: Secret'ы `app-deps`, `app-api`, `app-web` со случайными значениями (не печатаются), существующие не перезаписываются |
| `pnpm k8s:check` | `local-check.sh`: проверка маршрутов, закрытых путей, заголовков, лимитов тела и NetworkPolicy |
| `pnpm k8s:proxy [-- stop]` | `local-proxy.sh`: доступ на `https://myapp.local` (127.0.0.1:80/443) без sudo |
| `pnpm k8s:down` | `local-down.sh`: `minikube delete` с подтверждением (`-- --yes` без вопроса); данные БД удаляются |

Как устроено:
- Профиль `human-system-design`, `--driver=docker --cni=calico` (Calico нужен, чтобы работали NetworkPolicy). Ресурсы: `MINIKUBE_CPUS` (по умолчанию 3) и `MINIKUBE_MEMORY` в МБ (по умолчанию 4000). Docker Desktop должен иметь больше памяти, чем `MINIKUBE_MEMORY`.
- Образы собираются на хосте ДО старта кластера (сборка Next и minikube вместе не помещаются в ~5 ГБ Docker Desktop), потом `minikube image load`. Тег `local`, `pullPolicy: Never`. id образов кладётся в аннотацию подов, поэтому пересборка приводит к rollout без ручного `rollout restart`.
- Traefik v3 ставится из официального чарта `https://traefik.github.io/charts` (версия закреплена в скрипте) в namespace `traefik`, Service LoadBalancer 80/443.
- TLS: Secret `app-tls` для `myapp.local`. Если установлен mkcert, сертификат выпускается им (доверенный после `mkcert -install`), иначе самоподписанный через openssl. Самоподписанный браузер и Playwright не принимают (`ERR_CERT_AUTHORITY_INVALID`), поэтому для ручной проверки и e2e нужен mkcert: один раз `brew install mkcert && mkcert -install` (меняет системное хранилище доверия, делает пользователь), затем `REGENERATE_TLS=1 pnpm k8s:up`. Ingress с TLS слушает только `websecure` (http даёт 404), а Secure-cookie next-auth на http не сохранится, поэтому локально всё идёт по https.
- Доступ из браузера: строка `127.0.0.1 myapp.local` в `/etc/hosts` и `pnpm k8s:proxy`. Это контейнер с socat, который Docker Desktop публикует на `127.0.0.1:80/443` (без sudo, из локальной сети не виден) и который пересылает трафик на NodePort Traefik. Альтернатива: `minikube -p human-system-design tunnel` в отдельном терминале (просит sudo). Перед этим остановить compose (порт 80). `pnpm k8s:check` работает без прокси: port-forward на Traefik и `curl --resolve`.
- `values-local.yaml` включает `ENABLE_METRICS: "true"`, чтобы проверка блокировки `/api/metrics` была честной (404 отдаёт Traefik, а не выключенный api). В prod не включать.
- Реальные сторонние ключи (reCAPTCHA, Stripe test, почта, S3, Twilio). Регистрация и вход проверяют настоящую reCAPTCHA v3, поэтому с плейсхолдерами они не работают. Ключи переносит сам пользователь, значения не печатаются, не попадают в git и не проходят через агентов. Секретные ключи api кладутся в необязательный Secret `app-api-overrides` (`api.overridesSecret` в `values-local.yaml`), он перекрывает плейсхолдеры `app-api`:

```bash
# из корня основного checkout: пустые значения пропускаются, кавычки в .env переносятся как есть
grep -E '^(GOOGLE_CAPTCHA_SECRET_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|AWS_REGION|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_S3_BUCKET_NAME|EMAIL_PROVIDER|EMAIL_FROM|SENDGRID_API_KEY|RESEND_API_KEY|TWILIO_SID|TWILIO_AUTH_TOKEN|TWILIO_VERIFY_SERVICE_SID)=.+' apps/api/.env \
  | kubectl --context human-system-design -n app create secret generic app-api-overrides --from-env-file=/dev/stdin --dry-run=client -o yaml \
  | kubectl --context human-system-design apply -f -
kubectl --context human-system-design -n app rollout restart deploy/app-api
```
- `NEXT_PUBLIC_*` вшиваются в образ web при сборке. URL API скрипт задаёт сам (`https://myapp.local/api`, `http://api:3001`), а публичные ключи (reCAPTCHA site key, Stripe `pk_test`, Turnstile, Amplitude, GrowthBook) берёт из окружения. Пересборка с ключами из `apps/web/.env`: `(set -a; . apps/web/.env; set +a; pnpm k8s:deploy)`. Ключи reCAPTCHA должны разрешать домен `myapp.local`.
- Проверка обходов закрытых путей на живом Traefik и NetworkPolicy входят в `pnpm k8s:check` (29 проверок, все проходят). `/api/metrics` и прочие внутренние пути закрывает только middleware `block-internal` (отдельного правила в web Ingress нет: оно давало 308 на `/api/metrics/`). `/apimetrics` уходит в web, как `location /` в nginx; метрик в ответе нет.
- Занято памяти после `pnpm k8s:up`: около 1.7 ГиБ из 3.9 ГиБ узла minikube.

### Фаза 4. Сервер (devops + пользователь)
Делает пользователь:
1. Создать VM (Ubuntu 24.04), добавить SSH-ключ, открыть порты 22, 80 и 443. Порт 6443 наружу не открывать.
2. Поставить k3s: `curl -sfL https://get.k3s.io | sh -`.
3. Скопировать `/etc/rancher/k3s/k3s.yaml` к себе в `~/.kube/` и ходить в кластер через SSH-туннель.

Делает devops:
- `infra/scripts/server-bootstrap.sh`: ArgoCD, Sealed Secrets, cert-manager с ClusterIssuer Let's Encrypt (заполнить `k8s/clusterissuer.yaml`), применение `root-app`.
- Привести в порядок `infra/argocd/applications`: убрать пустые `backend.yaml`, `frontend.yaml` и `ingress-nginx`, у `app` поставить `values-prod.yaml` и namespace `app` вместо `production`.
- Инструкция, как зашифровать секреты через `kubeseal` и закоммитить их.
- CronJob для бэкапа Postgres.
- **Traefik в k3s**: `externalTrafficPolicy: Local` (через HelmChartConfig), иначе клиентский IP теряется, и в `TRUST_PROXY` задать подсеть подов, иначе rate limit общий на всех клиентов.
- **Глобальный редирект http -> https** через HelmChartConfig для Traefik (сейчас Ingress с TLS слушает только `websecure`, http не обслуживается).
- **Удалить старые Application** `redis.yaml`, `postgresql.yaml`, `ingress-nginx.yaml` (redis без пароля) ДО применения `root-app`, иначе они развернутся.
- **Сузить AppProject**: `sourceRepos`, `destinations`, whitelist ресурсов.
- **Образы deps**: закрепить digest (`postgres`, `redis`, `rabbitmq`), рассмотреть RabbitMQ 4.x (3.13 вышел из поддержки).
- **prisma-cli** в Dockerfile ставить с lock-файлом (сейчас `npm install` с одной закреплённой версией, транзитивные зависимости не зафиксированы).
- **Пароли deps**: при смене пароля в Secret `app-deps` пароль в уже инициализированном томе Postgres/RabbitMQ не меняется. Менять нужно и в самой БД (`ALTER USER`, `rabbitmqctl change_password`), либо пересоздавать том.
- ArgoCD-приложение `app` работает с ручным sync, включить `automated` в фазе 5, когда CI подставляет реальный `sha-` тег.

### Фаза 5. CI → деплой (devops)
- `helm.yml`: после сборки образа обновить `image.tag` в `values-prod.yaml` в этом репозитории коммитом `[skip ci]`.
- ArgoCD синхронизирует изменение, на сервере появляется новая версия.

### Фаза 6. Документация
- README и `CLAUDE.md` (правит человек или основная сессия по просьбе): три режима и их команды.

## Критерии приёмки

- `docker compose up` работает как раньше.
- `pnpm k8s:up` на чистой машине поднимает всё в minikube. `http://myapp.local` открывается, вход работает, миграции применены.
- `pnpm test:e2e` проходит на minikube.
- На сервере `https://<домен>` открывается с валидным сертификатом Let's Encrypt.
- Мерж в `main` сам выкатывает новую версию на сервер за ~10 минут, без ручных действий.
- Ни одного незашифрованного секрета в git.
- Бэкап Postgres каждые сутки попадает во внешнее хранилище.

## Риски

- Oracle Free: может не быть свободных мощностей, условия меняются, неактивные инстансы иногда забирают.
- 4 GB RAM на Hetzner CX23 — впритык. Ставим лимиты ресурсов, мониторинг выключен.
- Образы Bitnami могут не скачиваться, см. решение 8.
- Один сервер означает отсутствие отказоустойчивости. Для пет-проекта это нормально, а бэкапы защищают от потери данных.
