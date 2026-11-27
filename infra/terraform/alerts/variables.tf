variable "grafana_url" {
  description = "Адрес стека Grafana Cloud."
  type        = string
  default     = "https://playfullion1717.grafana.net"
}

variable "alert_email" {
  description = "Почта, на которую приходят алерты. Не коммитим: задайте в terraform.tfvars (он в .gitignore)."
  type        = string
}

variable "prometheus_datasource_uid" {
  description = "UID источника данных Prometheus стека Grafana Cloud."
  type        = string
  default     = "grafanacloud-prom"
}

variable "cluster" {
  description = "Значение метки cluster, которое Alloy ставит на все метрики (cluster.name в infra/helm/monitoring/values.yaml)."
  type        = string
  default     = "hsd-prod"
}
