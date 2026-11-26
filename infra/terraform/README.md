# infra/terraform

Сервер для прода: Hetzner Cloud + k3s. Контекст и решения: [docs/k8s-deploy.md](../../docs/k8s-deploy.md), фаза 4a.

## Что создаётся

- SSH-ключ (ваш публичный ключ),
- файрвол (22, 80, 443, ping; 6443 закрыт),
- сервер с Ubuntu 24.04, где cloud-init создаёт пользователя `deploy`, закрывает вход по паролю и под root и ставит k3s.

## Два корня: постоянный IP и сервер

- **`ip/`** создаёт Primary IPv4 (`hsd-prod-ipv4`) с `auto_delete = false` и защитой от удаления. У него свой state. Стоит ~0,73 $ в месяц, пока существует.
- **Корень `infra/terraform`** (SSH-ключ, файрвол, сервер) только читает этот IP по имени (`data "hcloud_primary_ip"`) и привязывает к серверу.

Зачем так: `terraform destroy` в основном корне удаляет всё, что в его state. IP вынесен в отдельный корень, поэтому при `destroy` и повторном `apply` сервера адрес остаётся тем же, а A-запись домена не приходится менять.

Порядок: сначала `ip/`, потом основной корень.

```bash
cd infra/terraform/ip
terraform init
terraform apply           # создаёт IP; адрес покажет terraform output ipv4
cd ..
terraform plan            # у существующего сервера адрес сменится: ожидайте `-/+` (replace)
terraform apply
```

Если сервер уже был создан без постоянного IP, `plan` покажет пересоздание сервера (`must be replaced`): у него сменится IP. Данных на нём ещё нет, поэтому это безопасно. После пересоздания SSH может ругаться на смену ключа хоста: уберите старую запись `ssh-keygen -R <ip>`.

Обычный цикл занятий: `terraform destroy` и `terraform apply` в `infra/terraform` (IP остаётся). `terraform destroy` в `ip/` намеренно упрётся в защиту: чтобы удалить адрес, поставьте `protect = false`, выполните `apply`, затем `destroy`.

## DNS в Cloudflare (`dns.tf`)

Основной корень создаёт A-записи `app.<domain>` (и `extra_subdomains`) на IP сервера. Нужно:

1. Купить домен в Cloudflare (Domain Registration, делает человек).
2. Создать API-токен Cloudflare: My Profile → API Tokens → Create Token, права **Zone → DNS → Edit** и **Zone → Zone → Read**, область: только ваша зона. Передавать только переменной окружения:

```bash
export CLOUDFLARE_API_TOKEN=...
```

3. В `terraform.tfvars` указать `domain = "example.com"` (обязательная переменная).

Режим записей «DNS only» (без оранжевого облака): Let's Encrypt проверяет сервер напрямую.

## Первый запуск

```bash
brew install hashicorp/tap/terraform          # один раз
export HCLOUD_TOKEN=...                       # токен Read & Write из консоли Hetzner (только в вашем терминале)
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars  # поправьте, особенно ssh_allowed_cidrs
terraform init                                # скачивает провайдер, создаёт .terraform.lock.hcl
terraform fmt -check && terraform validate    # синтаксис
terraform plan                                # что будет создано, ничего не меняет
terraform apply                               # создаёт ресурсы (спросит yes)
```

Через 1-2 минуты после `apply` cloud-init ещё ставит k3s. Проверка:

```bash
ssh deploy@<ipv4> 'sudo k3s kubectl get nodes'   # узел должен быть Ready
```

## Доступ к кластеру с вашего компьютера

Порт 6443 снаружи закрыт, поэтому через SSH-туннель (команда есть в `terraform output kubectl_tunnel`):

```bash
ssh -N -L 6443:127.0.0.1:6443 deploy@<ipv4>                           # в отдельном терминале
ssh deploy@<ipv4> 'sudo cat /etc/rancher/k3s/k3s.yaml' > ~/.kube/hsd-prod.yaml
KUBECONFIG=~/.kube/hsd-prod.yaml kubectl get nodes
```

## State в Cloudflare R2

State (файл, где Terraform помнит, какие ресурсы он создал) хранится в приватном бакете R2, а не на одном ноутбуке. Потеряете локальный файл, и Terraform «забудет» сервер, IP и DNS. Оба корня (`infra/terraform` и `infra/terraform/ip`) используют один бакет, но разные ключи (`prod/server.tfstate` и `prod/ip.tfstate`).

Один раз подготовьте в Cloudflare (R2 -> Create bucket) приватный бакет `hsd-tfstate` и R2-токен (Manage R2 API Tokens, права Object Read & Write на этот бакет и бакет бэкапов). Значения токена вводит только человек.

Миграция существующего локального state (запускать в каждом корне):

```bash
cp backend.hcl.example backend.hcl      # подставьте id аккаунта Cloudflare в endpoint (ip/: ключ prod/ip.tfstate)
export AWS_ACCESS_KEY_ID=...            # Access Key ID токена R2
export AWS_SECRET_ACCESS_KEY=...        # Secret Access Key токена R2
terraform init -migrate-state -backend-config=backend.hcl   # на вопрос про копирование state ответьте yes
terraform plan                                              # ожидаем "No changes"
```

После успешной миграции локальные `terraform.tfstate` и `terraform.tfstate.backup` можно удалить. В новой копии репозитория достаточно `terraform init -backend-config=backend.hcl`.

Блокировки state нет (один пользователь): не запускайте `apply` одновременно из двух окон.

## Опасные команды

- `terraform destroy` удаляет сервер вместе с диском и базой. Только после проверенного бэкапа.
- Смена `image` или `location` пересоздаёт сервер (данные теряются). Смена `server_type` (например `cpx22` → `cpx32`) делает resize на месте: сервер на минуту выключается, диск и данные остаются. Всегда читайте `terraform plan`: `update in-place` значит безопасно, `must be replaced` значит данные пропадут.
- `keep_disk = true` (по умолчанию) оставляет диск прежнего размера при resize, поэтому можно вернуться на тариф дешевле. Если поставить `false`, диск вырастет, и назад уже не вернуться.
- Когда на сервере появятся данные, поставьте `protect = true`: Hetzner откажется удалять сервер.
- Токены и `terraform.tfstate` в git не коммитим (`.gitignore` это уже учитывает).
