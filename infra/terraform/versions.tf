# Версии фиксируем, чтобы `terraform init` завтра не притащил другой провайдер.
# Точные версии записываются в .terraform.lock.hcl после первого `terraform init` (этот файл коммитим).
terraform {
  required_version = ">= 1.9"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }

  # State пока локальный (terraform.tfstate рядом, в .gitignore).
  # Следующий шаг плана: перенести его в бакет Cloudflare R2 (backend "s3"), см. docs/k8s-deploy.md, решение 11.
}
