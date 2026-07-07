#!/usr/bin/env bash
# dev.sh — start the Coverage Lab backend (uvicorn) and frontend (pnpm dev) together.
#
# Usage:
#   ./dev.sh              # backend on :8000, frontend on :3000
#   API_PORT=9000 ./dev.sh
#   WEB_PORT=3001 ./dev.sh
#
# Prerequisites:
#   - Python venv at services/api/.venv with projectedge-api installed
#     (see services/api/README or run: cd services/api && python -m venv .venv && .venv/bin/pip install -e .[dev] -e ../../packages/analytics)
#   - pnpm installed and `pnpm install` run at repo root
#   - apps/web/.env.local exists (copy from apps/web/.env.example and fill Clerk keys,
#     or set E2E_AUTH_BYPASS=true for local dev without Clerk)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$REPO_ROOT/services/api"
WEB_DIR="$REPO_ROOT/apps/web"
VENV="$API_DIR/.venv"

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"

# ── Prefixed log helper ────────────────────────────────────────────────────────
prefix() {
  local label="$1"
  while IFS= read -r line; do
    printf '%s %s\n' "$label" "$line"
  done
}

# ── Preflight checks ──────────────────────────────────────────────────────────
if [[ ! -f "$VENV/bin/uvicorn" && ! -f "$VENV/Scripts/uvicorn.exe" ]]; then
  echo ""
  echo "  ERROR: No uvicorn found in $VENV"
  echo ""
  echo "  Set up the backend venv first:"
  echo "    cd services/api"
  echo "    python -m venv .venv"
  echo "    .venv/bin/pip install -e .[dev] -e ../../packages/analytics"
  echo ""
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  echo "ERROR: pnpm not found on PATH"
  exit 1
fi

if [[ ! -f "$WEB_DIR/.env.local" ]]; then
  echo ""
  echo "  WARN: apps/web/.env.local not found."
  echo "  Copy apps/web/.env.example to apps/web/.env.local and fill in values."
  echo "  For local dev without Clerk: set E2E_AUTH_BYPASS=true"
  echo ""
fi

# ── Resolve uvicorn path (cross-platform venv layout) ─────────────────────────
if [[ -f "$VENV/bin/uvicorn" ]]; then
  UVICORN="$VENV/bin/uvicorn"
else
  UVICORN="$VENV/Scripts/uvicorn.exe"
fi

# ── Trap: kill both children on exit ─────────────────────────────────────────
API_PID=""
WEB_PID=""

cleanup() {
  echo ""
  echo "[dev] Stopping..."
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
  echo "[dev] Done."
}
trap cleanup INT TERM EXIT

# ── Launch backend ────────────────────────────────────────────────────────────
echo "[dev] Starting backend on :$API_PORT"
(
  cd "$API_DIR"
  "$UVICORN" app.main:app --reload --port "$API_PORT" 2>&1
) | prefix "[api]" &
API_PID=$!

# ── Wait for backend to be ready (max 15 s) ──────────────────────────────────
echo "[dev] Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$API_PORT/healthz" -o /dev/null 2>/dev/null; then
    echo "[dev] Backend ready."
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[dev] Backend process died during startup. Check [api] output above."
    exit 1
  fi
  sleep 0.5
done

# ── Launch frontend ───────────────────────────────────────────────────────────
echo "[dev] Starting frontend on :$WEB_PORT"
(
  cd "$WEB_DIR"
  pnpm exec next dev --port "$WEB_PORT" 2>&1
) | prefix "[web]" &
WEB_PID=$!

echo ""
echo "  Backend  http://127.0.0.1:$API_PORT"
echo "  Frontend http://localhost:$WEB_PORT"
echo ""
echo "  Press Ctrl+C to stop both."
echo ""

# ── Wait for either process to exit ──────────────────────────────────────────
wait -n "$API_PID" "$WEB_PID" 2>/dev/null || true
