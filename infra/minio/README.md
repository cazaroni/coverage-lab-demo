# MinIO Bootstrap (Phase 0)

This directory contains lean bootstrap scaffolding for local lake initialization.

Phase 0 scope only:

- Create the canonical lake bucket
- Seed canonical top-level prefixes as marker objects
- Keep path contracts aligned with Data workstream canonical templates

Out of scope in Phase 0:

- Ingestion pipelines
- Orchestration runtime
- Backfill/compaction jobs

## Quick start

1. Install dependencies:

```bash
pip install -r infra/minio/requirements.txt
```

2. Configure env vars (or use defaults in script):

- `MINIO_ENDPOINT` (default: `localhost:9000`)
- `MINIO_ACCESS_KEY` (default: `minioadmin`)
- `MINIO_SECRET_KEY` (default: `minioadmin`)
- `MINIO_SECURE` (`false` by default)
- `MINIO_BUCKET` (default: `projectedge-lake`)

3. Run bootstrap:

```bash
python infra/minio/bootstrap_minio.py
```
