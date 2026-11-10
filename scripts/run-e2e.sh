#!/usr/bin/env bash
# Builds the app, starts it on a throwaway database, and runs the browser test.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/arvo-shots}"
PORT="${PORT:-3111}"
DATA="$(mktemp -d)"
npx next build >/tmp/arvo-build.log 2>&1 || { tail -40 /tmp/arvo-build.log; exit 1; }
ARVO_DATA_DIR="$DATA" MARKET_DATA=sample node node_modules/next/dist/bin/next start -p "$PORT" >/tmp/arvo-server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; rm -rf "$DATA"' EXIT
for i in $(seq 1 40); do curl -sf "http://localhost:$PORT/" >/dev/null && break; sleep 0.5; done
BASE="http://localhost:$PORT" node scripts/e2e.mjs "$OUT"
