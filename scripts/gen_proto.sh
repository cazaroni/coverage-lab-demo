#!/usr/bin/env bash
# Regenerate the protobuf bindings for ProjectEdge and vendor identical copies
# into every service that needs them.
#
# WHY VENDORING + A PINNED COMPILER:
#   - packages/proto/inference.proto is the single source of truth.
#   - The generated inference_pb2.py embeds a gencode version. The runtime refuses
#     to load gencode NEWER than the installed protobuf runtime.
#   - services/api depends (transitively, via opentelemetry-exporter-otlp ->
#     opentelemetry-proto) on protobuf<7.0. So the bindings MUST be generated with
#     a libprotoc whose gencode is <= 6.33 (protoc 33.x). Newer protoc (34.x ->
#     gencode 7.x) makes app.main un-importable. See ADR-0001 and the inference
#     wiring plan.
#
# REQUIREMENTS (install into an isolated venv so the main env's protobuf 6.33.x
# runtime is never disturbed):
#   python -m venv .protogen && . .protogen/Scripts/activate   # (bash on Windows)
#   pip install "grpcio-tools" "protobuf>=6.33,<6.34"
#   # confirm: python -m grpc_tools.protoc --version  ->  libprotoc 33.x
#
# USAGE:  PROTOC_PY=/path/to/isolated/python scripts/gen_proto.sh
#   PROTOC_PY defaults to `python` (must have grpcio-tools with libprotoc 33.x).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROTO_DIR="$ROOT/packages/proto"
PROTOC_PY="${PROTOC_PY:-python}"

echo ">> regenerating $PROTO_DIR/inference_pb2.py with $PROTOC_PY"
"$PROTOC_PY" -m grpc_tools.protoc -I"$PROTO_DIR" --python_out="$PROTO_DIR" "$PROTO_DIR/inference.proto"

# Guard: gencode must be <= 6.x so the protobuf<7 runtime can load it.
gencode="$(grep -oE 'Protobuf Python Version: [0-9]+' "$PROTO_DIR/inference_pb2.py" | grep -oE '[0-9]+$')"
if [ "$gencode" -ge 7 ]; then
  echo "!! gencode major $gencode >= 7 — incompatible with protobuf<7. Use libprotoc 33.x." >&2
  exit 1
fi
echo ">> gencode major: $gencode (ok)"

# Vendor identical copies. api + inference also need the ADR-0001 hash helper.
vendor() {
  local dest="$1"; local with_hash="$2"
  mkdir -p "$dest"
  cp "$PROTO_DIR/inference_pb2.py" "$dest/inference_pb2.py"
  if [ "$with_hash" = "hash" ]; then
    cp "$PROTO_DIR/payload_hash.py" "$dest/payload_hash.py"
    cat > "$dest/__init__.py" <<'EOF'
"""Vendored protobuf bindings — generated from packages/proto/inference.proto.
Do not edit by hand; run scripts/gen_proto.sh to regenerate."""
from . import inference_pb2  # noqa: F401
from .payload_hash import hash_graph_payload, serialize_graph_payload  # noqa: F401
EOF
  fi
  echo ">> vendored -> $dest"
}

vendor "$ROOT/services/api/app/proto" hash
vendor "$ROOT/services/inference/src/projectedge_inference/proto" hash
# realtime only decodes frames; it needs the messages, not the hash helper.
cp "$PROTO_DIR/inference_pb2.py" "$ROOT/services/realtime/app/inference_pb2.py"
echo ">> refreshed services/realtime/app/inference_pb2.py"
echo ">> done"
