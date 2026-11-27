# Kubernetes: локально через minikube, на сервере через k3s

Статус: фазы 0-3 готовы, фазы 4-5 (сервер) ждут реализации. Обновлено 2026-11-26.

## Цель

- **Разработка** — как сейчас, через `docker compose` (hot reload, volume, `pnpm dev`).
- **Деплой** — Kubernetes. Один и тот же Helm-чарт работает в двух местах:
  - локально в **minikube**, чтобы проверить деплой перед пушем;
  - на сервере в **k3s** (лёгкий Kubernetes для одного сервера), где живёт приложение.
- **Инфраструктура как код** — сервер, файрвол и DNS описаны в **Terraform**, а не создаются руками в консоли. Сервер можно уничтожить и пересоздать командами.
- Бюджет пет-проекта: 0 € или до ~7 € в месяц.

## Стек и роли

| Что                     | Где                                                              | Цена        |
| ----------------------- | ---------------------------------------------------------------- | ----------- |
| Сервер                  | VPS **Hetzner** (x86), создаётся Terraform                       | ~6 €/мес    |
| Kubernetes и деплой     | k3s + Traefik + cert-manager + ArgoCD + Sealed Secrets           | 0           |
| Образы                  | GHCR (публичный репозиторий)                                     | 0           |
| DNS и домен             | **Cloudflare**: свой домен, A-записи через Terraform             | ~10 $ в год |
| Бэкапы Postgres и файлы | **Cloudflare R2** (S3-совместимое хранилище)                     | ~0          |
| Terraform state         | R2-бакет как S3-backend                                          | ~0          |
| Мониторинг              | Grafana Cloud free (агент в кластере шлёт метрики и логи наружу) | 0           |
| Платежи                 | Stripe, тестовый режим                                           | 0           |

AWS (EKS, S3) не используем: для текущей цели достаточно Hetzner и Cloudflare, а Kubernetes, GitOps и Terraform переносятся на любое облако.

## Окружения

|          | compose (разработка)                    | minikube (проверка деплоя)           | k3s на сервере (прод)              |
| -------- | --------------------------------------- | ------------------------------------ | ---------------------------------- |
| Запуск   | `docker compose up -d`                  | `pnpm k8s:up`                        | ArgoCD сам подтягивает `main`      |
| Код      | volume + dev-сервер                     | prod-образ, собранный в minikube     | prod-образ из GHCR                 |
| Конфиг   | `apps/*/.env`                           | Secret из локального `.env` (скрипт) | Sealed Secrets из git              |
| Маршруты | `nginx/templates/default.conf.template` | Ingress (Traefik)                    | Ingress (Traefik) + TLS            |
| Хост     | `myapp.local`                           | `myapp.local`                        | свой домен (`app.<домен>`)         |
| Values   | —                                       | `values.yaml` + `values-local.yaml`  | `values.yaml` + `values-prod.yaml` |

## Решения

1. **На сервере k3s, а не minikube.** minikube рассчитан на локальную машину. k3s ставится одной командой, держит нагрузку и потребляет мало памяти. Для Helm-чарта разницы нет.
2. **Один чарт, разные values.** Всё общее лежит в `values.yaml`, отличия только в `values-local.yaml` и `values-prod.yaml` (образ, хост, TLS, ресурсы, число реплик). Текущий `values-dev.yaml` переименовать в `values-local.yaml`.
3. **Ingress через Traefik, а не ingress-nginx.** Проект ingress-nginx в 2026 году перестал развиваться (Kubernetes объявил о его retirement). Traefik уже встроен в k3s, в minikube он ставится Helm-чартом. Так локально и на сервере будет одинаково. ArgoCD-приложение `ingress-nginx` убрать.
4. **Образы в GHCR.** Репозиторий публичный, так что хранение и скачивание бесплатные. Сервер x86, поэтому образы собираются только под `linux/amd64`.
5. **ArgoCD только на сервере.** Он сам забирает изменения из git, поэтому API кластера не нужно открывать в интернет, а GitHub Actions не нужен kubeconfig. Локально ArgoCD не ставим: `helm upgrade --install` проще, и не нужно пушить, чтобы проверить изменения.
6. **Секреты на сервере через Sealed Secrets.** В git лежат только зашифрованные `SealedSecret`, расшифровать их может только контроллер в кластере. Локально секреты создаёт скрипт из `.env`, и запускает его пользователь сам. Пустые файлы `infra/helm/secrets/*` удалить.
7. **Обновление тега образа.** CI собирает образ с тегом `sha-<commit>` и через PR (см. фазу 5) меняет этот тег в `values-prod.yaml` с пометкой `[skip ci]`, после чего ArgoCD выкатывает новую версию. Внешний gitops-репозиторий (`your-org/fullstack-gitops` в `helm.yml`) не нужен.
8. **БД.** Postgres, Redis и RabbitMQ работают в кластере на томах (на k3s это встроенный `local-path`). Бэкап Postgres делает CronJob с `pg_dump` в бакет Cloudflare R2. Образы Bitnami проверить: в 2025 году Bitnami убрал бесплатные образы из основного репозитория. Если они не скачиваются, использовать официальные образы `postgres`, `redis`, `rabbitmq` (простой StatefulSet) или оператор CloudNativePG для Postgres.
9. **Мониторинг (kube-prometheus-stack) не используем (заготовка удалена).** На 4 GB он не поместится вместе с приложением. Включать только на сервере, где 8 GB и больше. На 4 GB вместо него Grafana Cloud free: в кластер ставится лёгкий агент (Grafana Alloy), который отправляет метрики и логи наружу.
10. **Сервер создаёт Terraform.** Каталог `infra/terraform/` описывает SSH-ключ, файрвол, сервер Hetzner (с cloud-init, который ставит k3s) и DNS-записи в Cloudflare. Terraform, а не OpenTofu: оба совместимы по синтаксису, но Terraform проще гуглить. Если лицензия HashiCorp станет проблемой, переход на OpenTofu не требует переписывать код.
11. **State Terraform лежит в R2**, а не в git и не только на ноутбуке (backend `s3` с endpoint R2). State может содержать секреты, поэтому бакет приватный, а `*.tfstate`, `*.tfvars` и `.terraform/` в `.gitignore`. Токены (`HCLOUD_TOKEN`, `CLOUDFLARE_API_TOKEN`, ключи R2) передаются переменными окружения и не попадают в git и в чат. Реализовано: `backend "s3" {}` в обоих корнях, параметры подключения в `backend.hcl` (не в git), порядок миграции в `infra/terraform/README.md`.
12. **`terraform apply` запускает человек.** CI делает только `terraform fmt -check` и `terraform validate`. Автоматический apply из CI не нужен: он требует токены облака в GitHub Secrets, а выгоды для одного сервера нет.
13. **Файлы пользователей в R2.** `S3StorageService` умеет работать с R2 через две необязательные переменные: `AWS_S3_ENDPOINT` (адрес S3 API) и `AWS_S3_PUBLIC_URL` (публичный адрес бакета). Регион для R2 `auto`. Без них поведение прежнее (AWS S3). Ссылки на файлы публичные, поэтому в ключе счёта (PDF) есть случайный сегмент: номера счетов идут подряд, перебрать чужие нельзя. Порядок включения описан ниже, в разделе про R2 для загрузок.

## Сервер

**Hetzner** сдаёт обычные виртуальные серверы (VPS): без managed Kubernetes и managed Postgres, поэтому дёшево, а k3s и базы вы поднимаете сами. Для Terraform есть официальный провайдер `hetznercloud/hcloud`.

| Вариант           | Ресурсы                           | Цена                       | Заметки                                                                                             |
| ----------------- | --------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| Hetzner CPX22     | 2 vCPU AMD, 4 GB RAM, 80 GB NVMe  | 16,99 €/мес (0,0272 €/час) | 4 GB впритык: базовый стек без мониторинга и без staging.                                           |
| **Hetzner CPX32** | 4 vCPU AMD, 8 GB RAM, 160 GB NVMe | 30,49 €/мес (0,0489 €/час) | Выбранный вариант (2026-11-26): базовый стек и мониторинг в кластере; поднимается на время занятий. |

Цены с сайта Hetzner на 2026-11-26, окончательную покажет форма заказа. Линейка Cost-Optimized (CX и CAX, дешёвые тарифы) на эту дату недоступна для заказа, поэтому берём Regular Performance (CPX). Hetzner списывает деньги по часам, так что сервер можно поднимать на время занятий и удалять `terraform destroy` (после бэкапа).

Тип сервера задаётся переменной Terraform (`server_type`): смена тарифа делается правкой одной строки и выполняется как resize на месте. С `keep_disk = true` диск остаётся прежним, и можно вернуться на тариф дешевле.

Решение (2026-11-26): Oracle и AWS EKS не используем. Сервер x86 на Hetzner, CI собирает только `linux/amd64`. Если позже понадобится ARM (Hetzner CAX), добавить `linux/arm64` в `docker.yml`.

Решение (2026-11-26): **свой домен в Cloudflare** (~10 $ в год), а не `<ip>.sslip.io`. Причины: адрес сайта вшивается в образ web (`NEXT_PUBLIC_API_CLIENT_URL`), а сервер мы удаляем и пересоздаём; на чужом `sslip.io` нельзя подтвердить домен отправителя почты (SPF, DKIM) и нельзя сделать нормальный публичный домен для бакета R2. A-запись `app.<домен>` ведёт на IP сервера и обновляется Terraform (`infra/terraform/dns.tf`, провайдер `cloudflare/cloudflare`, режим «DNS only», TTL 60, чтобы Let's Encrypt HTTP-01 проходил напрямую). Дополнительно сервер имеет постоянный Primary IPv4 (`infra/terraform/ip`, `auto_delete = false`, защита от удаления, ~0,73 $ в месяц): он переживает `terraform destroy` сервера, и A-запись не приходится менять.

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

### Фаза 1b. S3-хранилище с поддержкой R2 (backend)

- `s3.service.ts`: необязательные `AWS_S3_ENDPOINT` и `AWS_S3_PUBLIC_URL`. Если заданы, `S3Client` получает `endpoint`, а `upload` возвращает ссылку на `AWS_S3_PUBLIC_URL`; если нет, поведение прежнее (AWS).
- Обновить `apps/api/.env.example`, `apps/api/src/config/` (если там валидация env) и unit-тест `s3.service.spec.ts`.
- Это не меняет контракт между web и api: меняется только значение ссылки на файл. Если web разрешает картинки по списку доменов (`next.config.js`, `images.remotePatterns`), добавить домен бакета R2.

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

| Команда                           | Что делает                                                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm k8s:up` / `pnpm k8s:deploy` | `infra/scripts/local-up.sh`: сборка образов на хосте, старт кластера (если не запущен), Traefik, Secret'ы, TLS, `helm upgrade --install` для `deps`, затем `app`. Повторный запуск пересобирает образы и обновляет релиз |
| `pnpm k8s:secrets [-- --force]`   | `local-secrets.sh`: Secret'ы `app-deps`, `app-api`, `app-web` со случайными значениями (не печатаются), существующие не перезаписываются                                                                                 |
| `pnpm k8s:check`                  | `local-check.sh`: проверка маршрутов, закрытых путей, заголовков, лимитов тела и NetworkPolicy                                                                                                                           |
| `pnpm k8s:proxy [-- stop]`        | `local-proxy.sh`: доступ на `https://myapp.local` (127.0.0.1:80/443) без sudo                                                                                                                                            |
| `pnpm k8s:down`                   | `local-down.sh`: `minikube delete` с подтверждением (`-- --yes` без вопроса); данные БД удаляются                                                                                                                        |

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

- `NEXT_PUBLIC_*` вшиваются в образ web при сборке. URL API скрипт задаёт сам (`https://myapp.local/api`, `http://api:3001`), а публичные ключи (reCAPTCHA site key, Stripe `pk_test`, Turnstile, Amplitude, GrowthBook) берёт из окружения. Без `NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY` скрипт предупреждает: web соберётся без reCAPTCHA, и регистрация с входом не заработают. Поэтому **каждый** `pnpm k8s:deploy` с пересборкой web запускайте с ключами. Ключи reCAPTCHA должны разрешать домен `myapp.local`.

  Загружать env-файлы через `. файл` ненадёжно: shell выполняет их как скрипт и падает на `&`, BOM, `\r` или пробелах вокруг `=`. Надёжный вариант: команда берёт только строки `NEXT_PUBLIC_*` из `.env` и `.env.local` (второй перекрывает первый, как в Next.js), ничего не выполняет, снимает кавычки и печатает только имена:

```bash
# из корня worktree/checkout, где лежит infra/; путь к apps/web поправьте под своё расположение
(while IFS= read -r kv; do export "$kv"; print -u2 "  экспортирован: ${kv%%=*}"; done < <(awk '{ sub(/^\xEF\xBB\xBF/, ""); sub(/\r$/, "") } /^[[:space:]]*(export[[:space:]]+)?NEXT_PUBLIC_[A-Z0-9_]+[[:space:]]*=/ { sub(/^[[:space:]]*(export[[:space:]]+)?/, ""); k=$0; sub(/[[:space:]]*=.*/, "", k); v=$0; sub(/^[^=]*=[[:space:]]*/, "", v); sub(/[[:space:]]+$/, "", v); if (v ~ /^".*"$/ || v ~ /^\x27.*\x27$/) v=substr(v, 2, length(v)-2); if (length(v) > 0) print k "=" v }' apps/web/.env apps/web/.env.local); pnpm k8s:deploy)
```

- Образы загружаются в minikube под уникальным тегом `local-<id образа>`: `minikube image load` с драйвером docker не перезаписывает образ с существующим тегом (даже с `--overwrite`), и раньше поды молча запускались со старой сборкой.
- Проверка обходов закрытых путей на живом Traefik и NetworkPolicy входят в `pnpm k8s:check` (29 проверок, все проходят). `/api/metrics` и прочие внутренние пути закрывает только middleware `block-internal` (отдельного правила в web Ingress нет: оно давало 308 на `/api/metrics/`). `/apimetrics` уходит в web, как `location /` в nginx; метрик в ответе нет.
- Занято памяти после `pnpm k8s:up`: около 1.7 ГиБ из 3.9 ГиБ узла minikube.
- e2e на minikube (проверено 2026-11-22: 78 из 78, полный прогон около 4.5 минут). Нужны `pnpm k8s:proxy`, доверенный сертификат mkcert, реальные ключи reCAPTCHA (см. выше) и отдельный тестовый пользователь для проектов `authenticated` (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, зарегистрируйте его на `https://myapp.local`):

```bash
E2E_BASE_URL=https://myapp.local pnpm --filter e2e exec playwright test
```

- Найдено при первом прогоне e2e на minikube, всё исправлено: web в production ставил cookie `__Secure-next-auth.session-token`, а api там принимает только `__Secure-authjs.session-token`, поэтому каждый авторизованный запрос получал 401. В compose это не видно, потому что там `NODE_ENV=development`. Кроме того, часть e2e отстала от security-правок: выход и смена email или пароля отзывают все сессии пользователя, 2FA требует текущий пароль, а письмо подтверждения отправляет сам api.

### Фаза 4a. Сервер через Terraform (devops + пользователь)

Делает пользователь (в браузере, значения токенов не передавать агентам и не коммитить):

1. Завести аккаунт Hetzner Cloud, создать проект и API-токен с правом записи (`HCLOUD_TOKEN`).
2. Завести аккаунт Cloudflare, создать R2-бакеты: приватный для Terraform state, приватный для бэкапов, бакет для файлов приложения. Выпустить R2-токены (S3 access key) и, если есть свой домен, API-токен для DNS (`CLOUDFLARE_API_TOKEN`).
3. Поставить Terraform локально (`brew install terraform`) и экспортировать токены переменными окружения.

Делает devops, каталог `infra/terraform/`:

- `versions.tf`, `providers.tf`: провайдеры `hcloud` и `cloudflare` с закреплёнными версиями; `backend "s3"` с endpoint R2 и флагами `skip_credentials_validation`, `skip_region_validation`, `skip_requesting_account_id`, `use_path_style`.
- `main.tf`: `hcloud_ssh_key`, `hcloud_firewall` (входящие 22, 80, 443; 22 лучше ограничить своим IP через переменную; порт 6443 закрыт), `hcloud_server` (Ubuntu 24.04, `server_type` из переменной, `user_data` с cloud-init).
- `cloud-init.yaml`: обновление пакетов, `unattended-upgrades`, установка k3s с закреплённой версией, запрет входа по паролю и под root. Traefik остаётся встроенным.
- `dns.tf`: запись A `app.<домен>` (и дополнительные поддомены) на IP сервера в Cloudflare. Значение `ingress.host` в `values-prod.yaml` берётся из output `app_host`.
- `outputs.tf`: IP сервера, готовая команда SSH.
- `variables.tf`, `terraform.tfvars.example` (образец без значений), `README.md` с командами `init`, `plan`, `apply`, `destroy`.
- `.gitignore`: `*.tfstate*`, `*.tfvars` (кроме `.example`), `.terraform/`. Файл `.terraform.lock.hcl` коммитить.
- CI (`.github/workflows`): `terraform fmt -check` и `terraform validate` на изменения в `infra/terraform/**`, без токенов и без apply.
- Доступ к кластеру: скопировать `/etc/rancher/k3s/k3s.yaml` в `~/.kube/` и ходить через SSH-туннель на `127.0.0.1:6443`.

Проверка: `terraform destroy` и затем `terraform apply` возвращают рабочий пустой кластер без ручных шагов.

### Фаза 4b. Bootstrap кластера (devops)

Реализовано (шаг 1, GitOps-основа):

- `infra/scripts/server-bootstrap.sh`: по SSH (без kubeconfig) ставит ArgoCD через Helm-контроллер k3s (чарт 10.20.0), применяет `project.yaml` и `root-app.yaml`. Идемпотентен. Режим `--backup-key` сохраняет ключ Sealed Secrets на Mac.
- `root-app` (app of apps) подтягивает `infra/argocd/applications`: `sealed-secrets` (чарт 2.22.0), `cert-manager` (v1.21.3), `cluster-issuers` (Let's Encrypt staging и prod, HTTP-01 через Traefik), `traefik-config` (HelmChartConfig: `externalTrafficPolicy: Local` и редирект http -> https), `app` (автосинхронизация с `prune` и `selfHeal`).
- Удалены устаревшие Application (`backend`, `frontend`, `ingress-nginx`, `postgresql`, `redis`, `monitoring`, старый `cert-manager`) и minikube-скрипт `bootstrap.sh`. AppProject сужен: `sourceRepos` и `destinations` перечислены явно.
- **Решение (2026-11-26): ключ Sealed Secrets хранится вне git, на Mac** (`~/.config/human-system-design/sealed-secrets-key.yaml`, права 600). Сервер одноразовый, а у каждого нового кластера контроллер генерирует новый ключ, и старые SealedSecret перестали бы расшифровываться. Bootstrap восстанавливает ключ из файла ДО старта контроллера. Порядок: первый bootstrap, затем `--backup-key`, затем шифрование секретов `kubeseal`.

Осталось (следующие шаги):

- Секреты и зависимости (шаг 2): `infra/scripts/seal-secrets.sh` генерирует случайные пароли и шифрует `app-deps`, `app-api`, `app-web` в `infra/k8s/app-secrets/` (SealedSecret, безопасны для git; значения не печатаются). Реальные ключи Stripe, почты, R2 и т.д. шифруются отдельно: `seal-secrets.sh --overrides <env-файл>` создаёт `app-api-overrides` (подключён через `api.overridesSecret`). Applications `app-secrets` (sync-wave 1) и `deps` (sync-wave 2, чарт `infra/helm/deps`: Postgres, Redis, RabbitMQ) в namespace `app`.
- В `TRUST_PROXY` задать подсеть подов (клиентский IP через Traefik).

- Бэкап и восстановление Postgres (R2):
  - CronJob `postgres-backup` (чарт `deps`, включён в Application `deps`): каждый день в 03:00 UTC `pg_dump` (формат custom) в бакет R2, файлы `postgres/mydb-<UTC дата-время>.dump` (хранятся 14 суток, чистит сам CronJob) и `postgres/latest.dump`. Пустой дамп не отправляется.
  - Хук `restore` (чарт `app`, `pre-install,pre-upgrade`, вес -5, раньше миграций): если в схеме `public` нет таблиц, скачивает `latest.dump` и делает `pg_restore` одной транзакцией. На непустой базе ничего не делает. Нет бэкапа или секрета: чистая установка.
  - Секрет `postgres-backup-r2` (ключи `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`): создаёт человек командой `infra/scripts/seal-secrets.sh --r2` (значения вводятся в терминале, секрет без эха), файл `infra/k8s/app-secrets/postgres-backup-r2.yaml` с шифртекстом коммитится.
  - Postgres принимает CronJob и Job восстановления отдельными правилами NetworkPolicy (`deps.postgresClients`).

- Почта (Resend, 2026-11-27): письма (например, счёт после оплаты) уходят через Resend, `EMAIL_PROVIDER: resend` в `values-prod.yaml`, отправитель `EMAIL_FROM=noreply@<домен>` (в SealedSecret `app-api`). Домен добавлен в Resend (регион eu-west-1, ручная настройка DNS). DNS-записи лежат в `infra/terraform/email-dns.tf`: DKIM (TXT `resend._domainkey`), два CNAME `rsend` и `send` (SPF и адрес возврата, только DNS, без прокси Cloudflare) и DMARC `p=none`. Корневые MX и SPF не затронуты. Ключ `RESEND_API_KEY` (право Sending access) создаёт человек в кабинете Resend и запечатывает `seal-secrets.sh --overrides <env-файл>`. Без подтверждённого домена Resend отправляет только на адрес владельца аккаунта. Если домен пересоздать в Resend, значения записей изменятся: обновить `email-dns.tf` и выполнить `terraform apply`.
  - Ограничения: потеря данных до 24 часов (RPO); если сервер пересоздан до первого бэкапа, восстанавливать нечего; ночной бэкап на пустой базе перезапишет `latest.dump`, но временные копии `mydb-*.dump` остаются 14 суток. Перед `terraform destroy` сделайте внеплановый бэкап: `kubectl -n app create job --from=cronjob/postgres-backup backup-manual`.
  - Ручное восстановление из другой копии: скачать нужный `mydb-*.dump` и `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" файл` внутри пода с `psql`. Раз в квартал проверять восстановление на minikube.
- Мониторинг (2026-11-27): Application `monitoring` (sync-wave 4, namespace `monitoring`) ставит чарт `grafana/k8s-monitoring` 4.6.2 (Alloy, kube-state-metrics, node-exporter) со значениями `infra/helm/monitoring/values.yaml`. Собирает метрики узла и подов, метрики api (`/metrics`: `http_requests_total`, `http_request_duration_seconds`, по аннотациям `k8s.grafana.com/*` на поде api; на проде включён `ENABLE_METRICS`, NetworkPolicy `allow-monitoring` пускает только namespace `monitoring`) и логи подов. Назначения: Prometheus и Loki стека Grafana Cloud Free (регион US East; тариф Free: 10 тыс. активных серий, 50 ГБ логов, хранение 14 дней). Логин и токен лежат в SealedSecret `grafana-cloud` (`infra/k8s/monitoring/grafana-cloud.yaml`), его создаёт `infra/scripts/seal-secrets.sh --grafana`: ID экземпляров и токен (Cloud access policy с правами `metrics:write`, `logs:write`) вводятся в терминале. Старая заготовка kube-prometheus-stack (`infra/helm/vendors/monitoring`, `infra/helm/values/prod/monitoring.yaml`) удалена: алерты и дашборд «API Overview» перенесены в Terraform (`infra/terraform/alerts`), в кластере она не использовалась.
- Алерты (2026-11-27): правила Grafana и получатель письма описаны в Terraform, корень `infra/terraform/alerts` (state `prod/alerts.tfstate` в R2, провайдер `grafana/grafana` 4.x, токен service account из переменной `GRAFANA_AUTH`, почта в `terraform.tfvars`). Правила: ApiDown, ApiHighErrorRate, ApiHighLatencyP95, PodNotReady, PodRestartingOften, PostgresBackupStale, NodeDiskAlmostFull, NodeMemoryHigh; уведомления на email, группировка по alertname, повтор раз в 4 часа. Правила узла работают после включения `hostMetrics` (node-exporter).
- Проверка доступности снаружи (2026-11-27): Grafana Synthetic Monitoring, две HTTP-проверки `hsd-web` (`/en`) и `hsd-api` (`/api/health`) с точек Frankfurt, London, Paris раз в 5 минут (около 52 тыс. запусков в месяц, лимит Free 100 тыс.), TLS обязателен. Проверки созданы в интерфейсе Grafana, алерты на них (`SiteDown`, `ApiHealthDown`, `TlsCertificateExpiresSoon`) описаны в `infra/terraform/alerts/rules.tf`.
- R2 для загрузок (2026-11-27, код готов, включает человек): `S3StorageService` читает `AWS_S3_ENDPOINT` и `AWS_S3_PUBLIC_URL`, причина ошибки загрузки пишется в лог api (клиенту по-прежнему общий 500). Включение на проде, значения вводит человек в своём терминале:
  1. Cloudflare Dashboard → R2 → создать приватный бакет `hsd-uploads`. Публичный доступ только через свой домен: бакет → Settings → Custom Domains → `files.<домен>` (не `r2.dev`: у него лимиты и нет кэша).
  2. R2 → Manage API tokens → токен «Object Read & Write», только на бакет `hsd-uploads` (отдельный от токенов state и бэкапов). Запомнить Access Key ID, Secret Access Key и адрес S3 API `https://<account-id>.r2.cloudflarestorage.com`.
  3. В локальный env-файл (вне git) для `infra/scripts/seal-secrets.sh --overrides <файл>` записать **все** ключи, режим пересобирает весь Secret `app-api-overrides`: `AWS_REGION=auto`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME=hsd-uploads`, `AWS_S3_ENDPOINT`, `AWS_S3_PUBLIC_URL=https://files.<домен>` и прежние `STRIPE_*`, `RESEND_API_KEY`, `EMAIL_*`, `TWILIO_*`, `GOOGLE_CAPTCHA_SECRET_KEY`. Закоммитить обновлённый `infra/k8s/app-secrets/app-api-overrides.yaml`, смержить, перезапустить api.
  4. Проверка: загрузить картинку к todo в приложении, ссылка открывается; оплатить тестовый счёт, PDF по ссылке из письма открывается (ключ вида `invoices/<uuid>/INV-…pdf`).
     Бакет публичный на чтение: в него нельзя класть ничего приватного, кроме объектов с неугадываемым ключом.
- Чистка заготовок (2026-11-27): удалены `infra/helm/vendors/*` (обёртки cert-manager, ingress-nginx, postgresql, redis) и `infra/helm/values/prod/*`. Ни ArgoCD, ни CI, ни скрипты на них не ссылались: cert-manager ставится напрямую из чарта в `infra/argocd/applications/cert-manager.yaml`, Postgres/Redis/RabbitMQ описаны в `infra/helm/deps`, ingress даёт Traefik из k3s. Старый пароль Postgres из `values/prod/postgresql.yaml` остался в истории git: см. FIX.md (P1), его нужно сменить, а не только удалить файл.
- CI для инфраструктуры (2026-11-27): `.github/workflows/terraform.yml` для каждого корня Terraform (`infra/terraform`, `ip`, `alerts`) выполняет `fmt -check`, `init -backend=false` и `validate`: без state и секретов, только синтаксис и типы. `.github/workflows/helm.yml` кроме `helm lint` и `helm template` для `app` и `deps` рендерит внешний чарт `grafana/k8s-monitoring` (версия берётся из `infra/argocd/applications/monitoring.yaml`) с `infra/helm/monitoring/values.yaml`: схема чарта ловит опечатки в ключах до выката. `terraform plan` в CI не запускается (нужны токены и доступ к R2), его по-прежнему выполняет человек перед apply.
- **Образы deps**: закрепить digest (`postgres`, `redis`, `rabbitmq`), рассмотреть RabbitMQ 4.x (3.13 вышел из поддержки).
- **prisma-cli** в Dockerfile ставить с lock-файлом (сейчас `npm install` с одной закреплённой версией, транзитивные зависимости не зафиксированы).
- **Пароли deps**: при смене пароля в Secret `app-deps` пароль в уже инициализированном томе Postgres/RabbitMQ не меняется. Менять нужно и в самой БД (`ALTER USER`, `rabbitmqctl change_password`), либо пересоздавать том.

### Фаза 5. CI → деплой (devops)

Решение (2026-11-26): прямые push в `main` запрещены ruleset'ом `protect-main` (исключений нет), поэтому тег обновляет **PR от CI**, а не коммит в `main`.

- `docker.yml`, job `deploy-tag`: после того как образы api и web запушены, меняет обе строки `tag:` в `values-prod.yaml` на `sha-<полный коммит>`, открывает PR `chore(deploy): images sha-<8 символов> [skip ci]` и сразу сливает его (`gh pr merge --squash`). Метка `[skip ci]` и условие в job `docker` не дают слиянию этого PR снова запустить CI и сборку (цикл).
- Нужна настройка репозитория (делает человек): Settings -> Actions -> General -> «Allow GitHub Actions to create and approve pull requests».
- Нужны Variables репозитория для сборки web (Settings -> Secrets and variables -> Actions -> Variables): `NEXT_PUBLIC_API_CLIENT_URL=https://app.vladyslavdmitriev.com/api` (сейчас там значение от minikube `https://myapp.local/api`, образы собираются с ним) и публичные ключи (`NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY` и т.д.).
- ArgoCD синхронизирует изменение, на сервере появляется новая версия. Application `app` работает с `automated` (`prune` и `selfHeal`, повторы `retry` для хуков при холодном старте): мерж PR от CI сам доезжает до сервера, ручной Sync не нужен. Ручные правки в кластере откатываются к git.
- Синхронизация цен Stripe: база на сервере одноразовая, и после пересоздания таблица `Product` пуста, а api отвечает `Unknown or unavailable price` на любой `priceId`. Поэтому Helm-хук `post-install,post-upgrade` (в ArgoCD это PostSync) запускает Job `sync-products` (`infra/helm/app/templates/sync-products-job.yaml`, скрипт `infra/helm/app/files/sync-products.js`). Он берёт активные цены из Stripe и делает upsert в `Product`, как `POST /billing/products/sync`, но без сессии ADMIN. Job получает только `DATABASE_URL` и `STRIPE_SECRET_KEY`; с заглушкой вместо ключа (локально) пропускает синхронизацию. Postgres принимает этот Job отдельным правилом NetworkPolicy (`deps.postgresClients`).
- Ограничение: PR, созданный через `GITHUB_TOKEN`, не запускает другие workflow. Если в `protect-main` появятся обязательные проверки, придётся заменить токен на GitHub App или PAT.

### Фаза 6. Документация

- README и `CLAUDE.md` (правит человек или основная сессия по просьбе): три режима и их команды, плюс упоминание `infra/terraform/` и правило «`terraform apply` и `destroy` только после подтверждения пользователя».

## Критерии приёмки

- `docker compose up` работает как раньше.
- `pnpm k8s:up` на чистой машине поднимает всё в minikube. `http://myapp.local` открывается, вход работает, миграции применены.
- `pnpm test:e2e` проходит на minikube.
- Сервер создаётся и уничтожается командами Terraform из `infra/terraform/`; после `apply` и bootstrap кластер поднимается без ручных правок на самом сервере.
- В git нет `*.tfstate`, `*.tfvars` и токенов; state лежит в приватном бакете R2.
- Загрузка файла в приложении кладёт его в R2, а ссылка на файл открывается.
- На сервере `https://<домен>` открывается с валидным сертификатом Let's Encrypt.
- Мерж в `main` сам выкатывает новую версию на сервер за ~10 минут, без ручных действий.
- Ни одного незашифрованного секрета в git.
- Бэкап Postgres каждые сутки попадает во внешнее хранилище.

## Риски

- 4 GB RAM на Hetzner CX23 — впритык. Ставим лимиты ресурсов, мониторинг уходит в Grafana Cloud. Если не хватает, меняем `server_type` на `cpx32` и делаем `terraform apply` (resize на месте, данные остаются; на всякий случай сначала бэкап, а в `plan` проверить, что нет `replace`).
- Terraform state содержит секреты и привязан к R2: потеря бакета или токена означает ручной импорт ресурсов. Бакет приватный, токены хранит человек.
- `terraform destroy` на сервере с данными удаляет диск вместе с Postgres. Запускать только после проверенного бэкапа.
- Опечатка в правилах файрвола может закрыть SSH. Сначала `terraform plan`, правила порта 22 менять осторожно (в крайнем случае консоль Hetzner даёт доступ к серверу).
- Образы Bitnami могут не скачиваться, см. решение 8.
- Один сервер означает отсутствие отказоустойчивости. Для пет-проекта это нормально, а бэкапы защищают от потери данных.
