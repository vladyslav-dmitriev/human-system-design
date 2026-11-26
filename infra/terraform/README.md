# infra/terraform

Сервер для прода: Hetzner Cloud + k3s. Контекст и решения: [docs/k8s-deploy.md](../../docs/k8s-deploy.md), фаза 4a.

## Что создаётся

- SSH-ключ (ваш публичный ключ),
- файрвол (22, 80, 443, ping; 6443 закрыт),
- сервер с Ubuntu 24.04, где cloud-init создаёт пользователя `deploy`, закрывает вход по паролю и под root и ставит k3s.

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

## Опасные команды

- `terraform destroy` удаляет сервер вместе с диском и базой. Только после проверенного бэкапа.
- Смена `image` или `location` пересоздаёт сервер (данные теряются). Смена `server_type` (например `cpx22` → `cpx32`) делает resize на месте: сервер на минуту выключается, диск и данные остаются. Всегда читайте `terraform plan`: `update in-place` значит безопасно, `must be replaced` значит данные пропадут.
- `keep_disk = true` (по умолчанию) оставляет диск прежнего размера при resize, поэтому можно вернуться на тариф дешевле. Если поставить `false`, диск вырастет, и назад уже не вернуться.
- Когда на сервере появятся данные, поставьте `protect = true`: Hetzner откажется удалять сервер.
- Токены и `terraform.tfstate` в git не коммитим (`.gitignore` это уже учитывает).
