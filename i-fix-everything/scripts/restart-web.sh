#!/usr/bin/env bash
# Stops whatever listens on :3000, then starts the production web server in the background.
set -euo pipefail
for pid in $(fuser -n tcp 3000 2>/dev/null || true); do kill "$pid" 2>/dev/null || true; done
for i in $(seq 1 20); do fuser -n tcp 3000 >/dev/null 2>&1 || break; sleep 0.5; done
cd "$(dirname "$0")/../apps/web"
nohup npx next start --port 3000 > "${WEB_LOG:-/tmp/ife-web.log}" 2>&1 &
for i in $(seq 1 40); do curl -sf localhost:3000/api/v1/meta >/dev/null && { echo "web ready on :3000"; exit 0; }; sleep 0.5; done
echo "web did not start; see ${WEB_LOG:-/tmp/ife-web.log}" >&2; exit 1
