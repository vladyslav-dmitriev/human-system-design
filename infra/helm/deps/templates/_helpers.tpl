{{- define "deps.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "deps.selector" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{- define "deps.clients" -}}
- podSelector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.networkPolicy.appName }}
      app.kubernetes.io/component: api
- podSelector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.networkPolicy.appName }}
      app.kubernetes.io/component: migrate
{{- end }}
