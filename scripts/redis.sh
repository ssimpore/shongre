#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

if [[ "$APP_ENV" != local ]]; then
  shongre_fail "local Redis commands require ENVIRONMENT=local"
  exit 2
fi
command -v docker >/dev/null 2>&1 || { shongre_fail "Docker is required"; exit 1; }
shongre_require_docker_daemon

export SHONGRE_RUNTIME_ENV_FILE="${SHONGRE_RUNTIME_ENV_FILE:-.env.local}"
export SHONGRE_FRONTEND_ENV_FILE="${SHONGRE_FRONTEND_ENV_FILE:-.env.example}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-shongre-${APP_ENV}}"
compose=(docker compose --project-directory "$SHONGRE_ROOT" -f "$SHONGRE_ROOT/compose.yaml" -f "$SHONGRE_ROOT/compose.local.yaml")

action="${1:-status}"
case "$action" in
  up)
    "${compose[@]}" up --detach --wait redis
    shongre_pass "Redis is ready on 127.0.0.1:${REDIS_PORT}"
    ;;
  down)
    "${compose[@]}" stop redis
    shongre_pass "Redis is stopped; its named volume is preserved"
    ;;
  status)
    "${compose[@]}" ps redis
    "${compose[@]}" exec -T redis redis-cli -p 6379 ping | grep -qx PONG
    shongre_pass "Redis ping"
    ;;
  logs)
    "${compose[@]}" logs --tail=200 redis
    ;;
  *)
    shongre_fail "usage: scripts/redis.sh <up|down|status|logs>"
    exit 2
    ;;
esac
