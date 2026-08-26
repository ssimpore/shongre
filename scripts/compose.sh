#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/env.sh"
source "$root/scripts/utils.sh"

command -v docker >/dev/null 2>&1 || { shongre_fail "Docker is required"; exit 1; }
docker compose version >/dev/null 2>&1 || { shongre_fail "Docker Compose v2 is required"; exit 1; }

export SHONGRE_RUNTIME_ENV_FILE="${SHONGRE_RUNTIME_ENV_FILE:-.env.local}"
export SHONGRE_FRONTEND_ENV_FILE="${SHONGRE_FRONTEND_ENV_FILE:-.env.example}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-shongre-${APP_ENV}}"
compose=(docker compose --project-directory "$root" -f "$root/compose.yaml" -f "$root/compose.local.yaml")

action="${1:-status}"
case "$action" in
  config)
    "${compose[@]}" --profile tunnel config --quiet
    shongre_pass "Docker Compose configuration is valid"
    ;;
  build)
    "${compose[@]}" build frontend backend
    ;;
  start)
    "${compose[@]}" up --detach --build --wait backend worker frontend
    ;;
  stop)
    "${compose[@]}" down --remove-orphans
    ;;
  status)
    "${compose[@]}" ps
    ;;
  health)
    "${compose[@]}" exec -T frontend node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
    "${compose[@]}" exec -T backend node -e "fetch('http://127.0.0.1:4000/readyz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
    shongre_pass "frontend and backend containers are healthy"
    ;;
  logs)
    "${compose[@]}" logs --tail=200 frontend backend worker
    ;;
  *)
    shongre_fail "usage: scripts/compose.sh <config|build|start|stop|status|health|logs>"
    exit 2
    ;;
esac
