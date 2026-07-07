"""Phase 0 MinIO bootstrap for ProjectEdge canonical lake prefixes."""

from __future__ import annotations

import os
from io import BytesIO

from minio import Minio

from prefixes import CANONICAL_PREFIX_MARKERS


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def get_client() -> Minio:
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    secure = _env_bool("MINIO_SECURE", default=False)
    return Minio(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=secure,
    )


def ensure_bucket(client: Minio, bucket_name: str) -> None:
    if client.bucket_exists(bucket_name):
        return
    client.make_bucket(bucket_name)


def ensure_prefix_markers(client: Minio, bucket_name: str) -> None:
    for prefix in CANONICAL_PREFIX_MARKERS:
        marker_name = f"{prefix}.keep"
        payload = BytesIO(b"phase0-prefix-marker")
        client.put_object(
            bucket_name=bucket_name,
            object_name=marker_name,
            data=payload,
            length=payload.getbuffer().nbytes,
            content_type="text/plain",
        )


def main() -> None:
    bucket_name = os.getenv("MINIO_BUCKET", "projectedge-lake")
    client = get_client()
    ensure_bucket(client, bucket_name)
    ensure_prefix_markers(client, bucket_name)
    print(f"Bootstrap complete for bucket: {bucket_name}")


if __name__ == "__main__":
    main()
