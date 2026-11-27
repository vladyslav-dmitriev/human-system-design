# Правила алертов Grafana (Grafana-managed alerting) на метрики из Prometheus стека Grafana Cloud.
# Часть правил перенесена из заготовки infra/helm/vendors/monitoring/templates/alerts-api.yaml (kube-prometheus-stack).
# Запрос возвращает число (или ничего), условие после него: op/threshold. Пустой ответ (no_data) для «пропавших»
# метрик считается тревогой (no_data = "Alerting"), для остальных правил нормой (no_data = "OK").

locals {
  c = var.cluster

  rules = {
    api = {
      interval = 60
      items = [
        {
          name      = "ApiDown"
          summary   = "api не отдаёт метрики: под не работает или недоступен"
          expr      = "max(up{cluster=\"${local.c}\", job=\"app\"})"
          op        = "lt"
          threshold = 1
          for       = "3m"
          severity  = "critical"
          no_data   = "Alerting"
        },
        {
          name      = "ApiHighErrorRate"
          summary   = "api: доля ответов 5xx выше 5% за 5 минут"
          expr      = "sum(rate(http_requests_total{cluster=\"${local.c}\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{cluster=\"${local.c}\"}[5m]))"
          op        = "gt"
          threshold = 0.05
          for       = "5m"
          severity  = "critical"
          no_data   = "OK"
        },
        {
          name      = "ApiHighLatencyP95"
          summary   = "api: p95 времени ответа выше 1 секунды (10 минут)"
          expr      = "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{cluster=\"${local.c}\"}[5m])))"
          op        = "gt"
          threshold = 1
          for       = "10m"
          severity  = "warning"
          no_data   = "OK"
        },
      ]
    }

    kubernetes = {
      interval = 60
      items = [
        {
          name      = "PodNotReady"
          summary   = "В namespace app есть под, который не готов принимать трафик (5 минут)"
          expr      = "sum(kube_pod_status_ready{cluster=\"${local.c}\", namespace=\"app\", condition=\"false\"})"
          op        = "gt"
          threshold = 0
          for       = "5m"
          severity  = "critical"
          no_data   = "OK"
        },
        {
          name      = "PodRestartingOften"
          summary   = "Под в namespace app перезапустился больше 3 раз за 15 минут (CrashLoop)"
          expr      = "max(increase(kube_pod_container_status_restarts_total{cluster=\"${local.c}\", namespace=\"app\"}[15m]))"
          op        = "gt"
          threshold = 3
          for       = "0s"
          severity  = "critical"
          no_data   = "OK"
        },
        {
          name      = "PostgresBackupStale"
          summary   = "Последний успешный бэкап Postgres в R2 был больше 36 часов назад"
          expr      = "time() - max(kube_cronjob_status_last_successful_time{cluster=\"${local.c}\", namespace=\"app\", cronjob=\"postgres-backup\"})"
          op        = "gt"
          threshold = 129600
          for       = "0s"
          severity  = "critical"
          # метрики нет, пока CronJob ни разу не отработал (первые сутки после пересоздания сервера): это не тревога
          no_data = "OK"
        },
      ]
    }

    # Метрики узла приходят после включения hostMetrics (node-exporter, PR «infra: scrape node-exporter»)
    node = {
      interval = 60
      items = [
        {
          name      = "NodeDiskAlmostFull"
          summary   = "На диске сервера занято больше 85%"
          expr      = "max((1 - node_filesystem_avail_bytes{cluster=\"${local.c}\", mountpoint=\"/\", fstype!~\"tmpfs|overlay\"} / node_filesystem_size_bytes{cluster=\"${local.c}\", mountpoint=\"/\", fstype!~\"tmpfs|overlay\"}) * 100)"
          op        = "gt"
          threshold = 85
          for       = "10m"
          severity  = "critical"
          no_data   = "OK"
        },
        {
          name      = "NodeMemoryHigh"
          summary   = "На сервере занято больше 90% памяти (10 минут)"
          expr      = "max((1 - node_memory_MemAvailable_bytes{cluster=\"${local.c}\"} / node_memory_MemTotal_bytes{cluster=\"${local.c}\"}) * 100)"
          op        = "gt"
          threshold = 90
          for       = "10m"
          severity  = "warning"
          no_data   = "OK"
        },
      ]
    }
  }
}

resource "grafana_folder" "hsd" {
  title = "human-system-design (prod)"
}

resource "grafana_rule_group" "g" {
  for_each = local.rules

  name             = each.key
  folder_uid       = grafana_folder.hsd.uid
  interval_seconds = each.value.interval

  dynamic "rule" {
    for_each = each.value.items

    content {
      name      = rule.value.name
      condition = "C"
      for       = rule.value.for

      no_data_state  = rule.value.no_data
      exec_err_state = "Error"

      annotations = {
        summary = rule.value.summary
      }
      labels = {
        severity = rule.value.severity
      }

      # A: запрос в Prometheus
      data {
        ref_id         = "A"
        datasource_uid = var.prometheus_datasource_uid

        relative_time_range {
          from = 600
          to   = 0
        }

        model = jsonencode({
          refId         = "A"
          expr          = rule.value.expr
          instant       = true
          range         = false
          editorMode    = "code"
          intervalMs    = 1000
          maxDataPoints = 43200
        })
      }

      # B: последнее значение
      data {
        ref_id         = "B"
        datasource_uid = "__expr__"

        relative_time_range {
          from = 0
          to   = 0
        }

        model = jsonencode({
          refId      = "B"
          type       = "reduce"
          datasource = { type = "__expr__", uid = "__expr__" }
          expression = "A"
          reducer    = "last"
          settings   = { mode = "dropNN" }
        })
      }

      # C: сравнение с порогом (условие тревоги)
      data {
        ref_id         = "C"
        datasource_uid = "__expr__"

        relative_time_range {
          from = 0
          to   = 0
        }

        model = jsonencode({
          refId      = "C"
          type       = "threshold"
          datasource = { type = "__expr__", uid = "__expr__" }
          expression = "B"
          conditions = [{
            evaluator = { type = rule.value.op, params = [rule.value.threshold] }
          }]
        })
      }
    }
  }
}
