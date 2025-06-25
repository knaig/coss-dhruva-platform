{{/*
Expand the name of the chart.
*/}}
{{- define "dhruva-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "dhruva-platform.fullname" -}}
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

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "dhruva-platform.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "dhruva-platform.labels" -}}
helm.sh/chart: {{ include "dhruva-platform.chart" . }}
{{ include "dhruva-platform.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "dhruva-platform.selectorLabels" -}}
app.kubernetes.io/name: {{ include "dhruva-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "dhruva-platform.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "dhruva-platform.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Server labels
*/}}
{{- define "dhruva-platform.server.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
Server selector labels
*/}}
{{- define "dhruva-platform.server.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
Client labels
*/}}
{{- define "dhruva-platform.client.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: client
{{- end }}

{{/*
Client selector labels
*/}}
{{- define "dhruva-platform.client.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: client
{{- end }}

{{/*
Celery worker labels
*/}}
{{- define "dhruva-platform.celery.worker.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: celery-worker
{{- end }}

{{/*
Celery worker selector labels
*/}}
{{- define "dhruva-platform.celery.worker.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: celery-worker
{{- end }}

{{/*
Celery metering labels
*/}}
{{- define "dhruva-platform.celery.metering.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: celery-metering
{{- end }}

{{/*
Celery metering selector labels
*/}}
{{- define "dhruva-platform.celery.metering.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: celery-metering
{{- end }}

{{/*
Celery monitoring labels
*/}}
{{- define "dhruva-platform.celery.monitoring.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: celery-monitoring
{{- end }}

{{/*
Celery monitoring selector labels
*/}}
{{- define "dhruva-platform.celery.monitoring.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: celery-monitoring
{{- end }}

{{/*
Celery beat labels
*/}}
{{- define "dhruva-platform.celery.beat.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: celery-beat
{{- end }}

{{/*
Celery beat selector labels
*/}}
{{- define "dhruva-platform.celery.beat.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: celery-beat
{{- end }}

{{/*
Flower labels
*/}}
{{- define "dhruva-platform.flower.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: flower
{{- end }}

{{/*
Flower selector labels
*/}}
{{- define "dhruva-platform.flower.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: flower
{{- end }}

{{/*
TimescaleDB labels
*/}}
{{- define "dhruva-platform.timescaledb.labels" -}}
{{ include "dhruva-platform.labels" . }}
app.kubernetes.io/component: timescaledb
{{- end }}

{{/*
TimescaleDB selector labels
*/}}
{{- define "dhruva-platform.timescaledb.selectorLabels" -}}
{{ include "dhruva-platform.selectorLabels" . }}
app.kubernetes.io/component: timescaledb
{{- end }}

{{/*
Common environment variables for all services
*/}}
{{- define "dhruva-platform.commonEnv" -}}
- name: ENV
  value: {{ .Values.config.environment | quote }}
- name: REDIS_HOST
  value: {{ include "dhruva-platform.fullname" . }}-redis-master
- name: REDIS_PORT
  value: "6379"
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "dhruva-platform.fullname" . }}-secrets
      key: redis-password
- name: CELERY_BROKER_URL
  value: "amqp://admin:$(RABBITMQ_PASSWORD)@{{ include "dhruva-platform.fullname" . }}-rabbitmq:5672/dhruva_host"
- name: RABBITMQ_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "dhruva-platform.fullname" . }}-secrets
      key: rabbitmq-password
- name: APP_DB_CONNECTION_STRING
  value: "mongodb://dhruva:$(MONGODB_PASSWORD)@{{ include "dhruva-platform.fullname" . }}-mongodb:27017/dhruva"
- name: MONGODB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "dhruva-platform.fullname" . }}-secrets
      key: mongodb-password
- name: TIMESCALE_HOST
  value: {{ include "dhruva-platform.fullname" . }}-timescaledb
- name: TIMESCALE_PORT
  value: "5432"
- name: TIMESCALE_USER
  value: "postgres"
- name: TIMESCALE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "dhruva-platform.fullname" . }}-secrets
      key: timescaledb-password
- name: TIMESCALE_DATABASE_NAME
  value: {{ .Values.timescaledb.auth.database | quote }}
- name: HEARTBEAT_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "dhruva-platform.fullname" . }}-secrets
      key: heartbeat-api-key
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "dhruva-platform.fullname" . }}-secrets
      key: jwt-secret
{{- end }}

{{/*
Image pull policy
*/}}
{{- define "dhruva-platform.imagePullPolicy" -}}
{{- if .Values.global.imageRegistry }}
{{- .Values.global.imagePullPolicy | default "IfNotPresent" }}
{{- else }}
{{- "IfNotPresent" }}
{{- end }}
{{- end }}

{{/*
Full image name
*/}}
{{- define "dhruva-platform.image" -}}
{{- $registry := .Values.global.imageRegistry | default .registry -}}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry .repository .tag }}
{{- else }}
{{- printf "%s:%s" .repository .tag }}
{{- end }}
{{- end }}