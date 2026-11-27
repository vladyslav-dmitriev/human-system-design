# Алерты Grafana (Terraform)

Правила алертов и получатель писем для стека Grafana Cloud. Отдельный корень Terraform со своим state (`prod/alerts.tfstate` в бакете R2): алерты можно менять, не трогая сервер.

Что здесь:
- `rules.tf`: папка и группы правил (`api`, `kubernetes`, `node`). Запрос в Prometheus, затем `reduce last` и порог. Часть правил перенесена из заготовки `infra/helm/vendors/monitoring`.
- `contact.tf`: контакт `email-owner` (письмо на `alert_email`) и корневая политика уведомлений (группировка по `alertname`, повтор раз в 4 часа).

Правила: `ApiDown`, `ApiHighErrorRate`, `ApiHighLatencyP95`, `PodNotReady`, `PodRestartingOften`, `PostgresBackupStale`, `NodeDiskAlmostFull`, `NodeMemoryHigh`.

## Применение (в вашем терминале)

1. В Grafana: Administration -> Users and access -> Service accounts -> Add service account (роль Admin), Add token. Токен покажут один раз.
2. Подготовьте файлы (оба в .gitignore):
   ```bash
   cd infra/terraform/alerts
   cp backend.hcl.example backend.hcl        # подставьте endpoint R2 как в ../backend.hcl, ключ уже prod/alerts.tfstate
   cp terraform.tfvars.example terraform.tfvars   # впишите alert_email
   ```
3. Токены только в окружении этого окна терминала:
   ```bash
   export GRAFANA_AUTH=glsa_...              # токен service account
   export AWS_ACCESS_KEY_ID=...              # ключи R2 (state), как для остальных корней
   export AWS_SECRET_ACCESS_KEY=...
   terraform init -backend-config=backend.hcl
   terraform plan
   terraform apply
   ```
