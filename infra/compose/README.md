# Compose Contract

Platform owns canonical service names, ports, networks, and volumes.

## Files

- `base/docker-compose.yml`: canonical topology and profile gates.
- `dev/docker-compose.yml`: local port publishing for lean Phase 0 and opt-in profiles.
- `staging/docker-compose.yml`: staging overlays and ingress (`caddy` profile).

## Profile model

Default (lean Phase 0): no profile flags needed.

Opt-in services:

- `inference`
- `realtime`
- `chatbot`
- `orchestrator`

Staging ingress:

- `staging` (enables `caddy` service)

## Canonical services and ports

| Service | Internal Port(s) | Public in Dev | Public in Staging |
|---|---:|---|---|
| `web` | 3000 | yes | via `caddy` |
| `api` | 8000 | yes | via `caddy` |
| `postgres` | 5432 | yes (dev only) | no |
| `minio` | 9000, 9001 | yes (dev only) | no |
| `mlflow` | 5000 | yes (dev only) | no |
| `otel-collector` | 4317, 4318, 8889 | yes (dev only) | no |
| `prometheus` | 9090 | yes (dev only) | no |
| `loki` | 3100 | yes (dev only) | no |
| `tempo` | 3200 | yes (dev only) | no |
| `grafana` | 3000 | yes (dev only, mapped to 3001 by default) | no |
| `inference` | 3001 | opt-in profile | no |
| `realtime` | 8090 | opt-in profile | opt-in via `caddy` gate |
| `chatbot` | 8092 | opt-in profile | no |
| `orchestrator` | 8093 | opt-in profile | no |

## Health expectations

- `api` must expose `/healthz` and `/metrics` in Phase 0.
- `inference` must expose `/healthz`, `/readyz`, and `/metrics` in Phase 0.
- `web` remains a frontend-owned service. Until the frontend workstream adds `/healthz`, the compose health probe uses `/` to keep the lean stack bootable without changing application behavior in this pass.

## Example commands

Local Phase 0:

```bash
docker compose \
  -f infra/compose/base/docker-compose.yml \
  -f infra/compose/dev/docker-compose.yml \
  up -d
```

Local with inference + realtime:

```bash
docker compose \
  -f infra/compose/base/docker-compose.yml \
  -f infra/compose/dev/docker-compose.yml \
  --profile inference \
  --profile realtime \
  up -d
```

Staging:

```bash
docker compose \
  -f infra/compose/base/docker-compose.yml \
  -f infra/compose/staging/docker-compose.yml \
  --profile staging \
  up -d
```
