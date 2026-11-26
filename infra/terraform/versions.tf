# Версии фиксируем, чтобы `terraform init` завтра не притащил другой провайдер.
# Точные версии записываются в .terraform.lock.hcl после первого `terraform init` (этот файл коммитим).
terraform {
  required_version = ">= 1.9"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }

    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State лежит в приватном бакете Cloudflare R2 (S3-совместимое хранилище), а не на одном ноутбуке.
  # Настройки подключения (бакет, endpoint с id аккаунта) не в git: они в backend.hcl (см. backend.hcl.example),
  # ключи доступа из окружения: AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY (ключи R2, не AWS).
  #   terraform init -backend-config=backend.hcl
  backend "s3" {}
}
