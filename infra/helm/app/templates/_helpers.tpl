{{- define "app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Общие метки (без component) */}}
{{- define "app.labels" -}}
helm.sh/chart: {{ include "app.chart" . }}
app.kubernetes.io/name: {{ include "app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/* Метки селектора компонента. Вызов: include "app.selectorLabels" (dict "root" . "component" "api") */}}
{{- define "app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "app.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/* Образ компонента. Вызов: include "app.image" (dict "image" .Values.api.image) */}}
{{- define "app.image" -}}
{{- if .image.tag -}}
{{- printf "%s:%s" .image.repository .image.tag -}}
{{- else -}}
{{- fail "image.tag обязателен (latest в прод не используем): задайте api.image.tag / web.image.tag" -}}
{{- end -}}
{{- end }}

{{/* Схема и URL клиента: https при включённом TLS */}}
{{- define "app.clientUrl" -}}
{{- if .Values.config.api.CLIENT_URL -}}
{{- .Values.config.api.CLIENT_URL -}}
{{- else -}}
{{- printf "%s://%s" (ternary "https" "http" .Values.ingress.tls.enabled) .Values.ingress.host -}}
{{- end -}}
{{- end }}

{{/* Контекст безопасности контейнера */}}
{{- define "app.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
runAsNonRoot: true
runAsUser: 1000
runAsGroup: 1000
capabilities:
  drop: ["ALL"]
seccompProfile:
  type: RuntimeDefault
{{- end }}
