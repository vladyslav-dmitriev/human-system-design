terraform {
  required_version = ">= 1.9"

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 4.0"
    }
  }

  # State в том же приватном бакете R2, ключ prod/alerts.tfstate (см. backend.hcl.example)
  backend "s3" {}
}
