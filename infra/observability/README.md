# Observability Skeleton

Platform minimum for every service:

- `/healthz`
- structured logs
- OTel traces
- metrics
- a dashboard stub

## Stack

- `otel-collector`
- `prometheus`
- `loki`
- `tempo`
- `grafana`

## Layout

- `otel/otel-collector.yaml`
- `prometheus/prometheus.yml`
- `loki/loki-config.yml`
- `tempo/tempo.yml`
- `grafana/provisioning/*`
- `grafana/dashboards/*.json`

