#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/env.sh"
source "$root/scripts/utils.sh"

if [[ "$APP_ENV" != local ]]; then
  shongre_fail "local Docker commands require ENVIRONMENT=local; hosted environments use make deploy ENVIRONMENT=dev|staging|prod"
  exit 2
fi

command -v docker >/dev/null 2>&1 || { shongre_fail "Docker is required"; exit 1; }
docker compose version >/dev/null 2>&1 || { shongre_fail "Docker Compose v2 is required"; exit 1; }

export SHONGRE_RUNTIME_ENV_FILE="${SHONGRE_RUNTIME_ENV_FILE:-.env.local}"
export SHONGRE_FRONTEND_ENV_FILE="${SHONGRE_FRONTEND_ENV_FILE:-.env.example}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-shongre-${APP_ENV}}"
configure_container_urls() {
  local container_database_url="${DATABASE_URL:-}"
  local container_supabase_url="${SUPABASE_URL:-}"
  export SHONGRE_CONTAINER_DATABASE_URL="${container_database_url//$SUPABASE_HOST/host.docker.internal}"
  export SHONGRE_CONTAINER_SUPABASE_URL="${container_supabase_url//$SUPABASE_HOST/host.docker.internal}"
}
configure_container_urls
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
    "$root/scripts/supabase.sh" up
    set -a
    source "$root/.runtime/supabase.env"
    set +a
    configure_container_urls
    "$root/scripts/database.sh" migrate
    "$root/scripts/database.sh" seed
    "${compose[@]}" up --detach --build --wait redis backend worker frontend
    ;;
  stop)
    "${compose[@]}" down --remove-orphans
    "$root/scripts/supabase.sh" down
    ;;
  prune-stale)
    # Remove containers of this compose project that are no longer running and
    # images not referenced by any container. Running containers and named
    # volumes remain untouched, so the local database survives. Supabase owns
    # its own containers and deliberately keeps some of them stopped, so they
    # are matched by project label rather than by name. Images removed here are
    # rebuilt or pulled on demand by the next local run.
    shongre_require_docker_daemon || exit 1
    stale="$(docker ps --all --quiet \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT_NAME}" \
      --filter status=created --filter status=exited --filter status=dead)"
    if [[ -n "$stale" ]]; then
      # shellcheck disable=SC2086 # container ids are newline separated by docker
      docker rm --volumes $stale >/dev/null
      shongre_pass "removed $(printf '%s\n' "$stale" | wc -l | tr -d ' ') stale ${COMPOSE_PROJECT_NAME} container(s)"
    fi
    reclaimed="$(docker image prune --all --force | awk '/^Total reclaimed space/ { print $4 $5 }')"
    if [[ -n "$reclaimed" && "$reclaimed" != "0B" ]]; then
      shongre_pass "reclaimed $reclaimed of unused image data"
    fi
    ;;
  status)
    "${compose[@]}" ps
    ;;
  health)
    "${compose[@]}" exec -T frontend node -e "fetch('http://127.0.0.1:' + process.env.FRONTEND_PORT + '/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
    "${compose[@]}" exec -T backend node -e "fetch('http://127.0.0.1:' + process.env.BACKEND_PORT + '/readyz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
    "${compose[@]}" exec -T worker node dist/worker-health.js
    "${compose[@]}" exec -T redis redis-cli -p 6379 ping | grep -qx PONG
    shongre_pass "frontend, backend, worker, and Redis containers are healthy"
    ;;
  logs)
    "${compose[@]}" logs --tail=200 frontend backend worker redis
    ;;
  *)
    shongre_fail "usage: scripts/compose.sh <config|build|start|stop|prune-stale|status|health|logs>"
    exit 2
    ;;
esac
