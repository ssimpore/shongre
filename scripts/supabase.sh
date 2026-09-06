#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"
cd "$SHONGRE_ROOT"

action="${1:-status}"

require_local_supabase() {
  "$SHONGRE_ROOT/scripts/env-check.sh"
  if [[ "$APP_ENV" != "local" || "$DATABASE_INFRA_MODE" != "local" ]]; then
    shongre_fail "local Supabase commands require APP_ENV=local and DATABASE_INFRA_MODE=local"
    exit 1
  fi
}

require_cli() {
  command -v supabase >/dev/null 2>&1 || {
    shongre_fail "Supabase CLI is unavailable; run make install"
    exit 1
  }
}

case "$action" in
  up)
    require_local_supabase
    require_cli
    command -v docker >/dev/null 2>&1 || {
      shongre_fail "Docker is required for local Supabase"
      exit 1
    }
    docker info >/dev/null 2>&1 || {
      shongre_fail "Docker daemon is unavailable; start Docker and retry"
      exit 1
    }
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh"
    supabase start --workdir "$SHONGRE_ROOT/backend"
    "$SHONGRE_ROOT/scripts/sync-local-supabase-env.sh"
    shongre_pass "local Supabase is ready"
    ;;
  down)
    require_local_supabase
    require_cli
    supabase stop --workdir "$SHONGRE_ROOT/backend"
    rm -f "$SHONGRE_ROOT/.runtime/supabase.env"
    shongre_pass "local Supabase is stopped"
    ;;
  status)
    require_local_supabase
    require_cli
    supabase status --workdir "$SHONGRE_ROOT/backend"
    ;;
  health)
    require_local_supabase
    require_cli
    if supabase status --workdir "$SHONGRE_ROOT/backend" >/dev/null 2>&1; then
      shongre_pass "local Supabase services"
    else
      shongre_fail "local Supabase is not healthy; run make supabase-up"
      exit 1
    fi
    ;;
  logs)
    require_local_supabase
    require_cli
    shongre_info "Supabase service endpoints"
    supabase status --workdir "$SHONGRE_ROOT/backend"
    shongre_info "use Docker Desktop for individual local Supabase container logs"
    ;;
  config)
    require_local_supabase
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh"
    shongre_pass "generated backend/supabase/config.toml from the local environment"
    ;;
  *)
    shongre_fail "usage: scripts/supabase.sh <up|down|status|health|logs|config>"
    exit 2
    ;;
esac
