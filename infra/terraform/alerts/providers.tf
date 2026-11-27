# Токен service account Grafana НЕ пишем в файлы. Провайдер читает переменную окружения GRAFANA_AUTH:
#   export GRAFANA_AUTH=glsa_...   (в вашем терминале, не в файле и не в чате)
# Service account: Grafana -> Administration -> Users and access -> Service accounts, роль Admin (или Editor), токен.
provider "grafana" {
  url = var.grafana_url
}
