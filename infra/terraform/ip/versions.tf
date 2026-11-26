terraform {
  required_version = ">= 1.9"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }

  # State в бакете R2, у корня ip/ свой ключ (key) в backend.hcl. См. backend.hcl.example и README в infra/terraform.
  backend "s3" {}
}
