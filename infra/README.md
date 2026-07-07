# ProjectEdge Platform Scaffold (Phase 0)

This directory is platform-owned and defines canonical runtime topology for local and staging environments.

## Compose layering

- `infra/compose/base/docker-compose.yml`: canonical service names, networks, volumes, and profile gates.
- `infra/compose/dev/docker-compose.yml`: local developer port exposure and defaults.
- `infra/compose/staging/docker-compose.yml`: staging-oriented exposure and runtime expectations.

## Phase 0 defaults

Lean Phase 0 stack:

- `postgres`
- `minio`
- `mlflow`
- `otel-collector`
- `prometheus`
- `loki`
- `tempo`
- `grafana`
- `api`
- `web`

Opt-in profiles:

- `inference`
- `realtime`
- `chatbot`
- `orchestrator`

## Quick start

```bash
docker compose \
  -f infra/compose/base/docker-compose.yml \
  -f infra/compose/dev/docker-compose.yml \
  up -d
```

