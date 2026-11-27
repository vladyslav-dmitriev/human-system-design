# Куда приходят алерты: письмо на alert_email (почта Grafana Cloud, отдельный SMTP не нужен).
resource "grafana_contact_point" "email" {
  name = "email-owner"

  email {
    addresses               = [var.alert_email]
    single_email            = true
    disable_resolve_message = false
  }
}

# Корневая политика: все алерты уходят на email. Группируем по имени, чтобы не получать десятки одинаковых писем.
resource "grafana_notification_policy" "root" {
  contact_point   = grafana_contact_point.email.name
  group_by        = ["alertname"]
  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "4h"
}
