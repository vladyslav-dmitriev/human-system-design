# Дашборд «API Overview»: запросы в секунду, доля 5xx, p95 по маршрутам, кэш Redis, запросы к БД, память Node.js.
# Перенесён из старой заготовки kube-prometheus-stack (infra/helm/vendors/monitoring); источник данных теперь Prometheus Grafana Cloud.
resource "grafana_dashboard" "api_overview" {
  folder      = grafana_folder.hsd.uid
  config_json = file("${path.module}/dashboards/api-overview.json")
  overwrite   = true
}
