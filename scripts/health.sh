#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

mode="${1:-stack}"
failed=0

require_process() {
  local service_name="$1" pid_file tracked_pid
  pid_file="$(shongre_pid_file "$service_name")"
  if [[ ! -f "$pid_file" ]]; then
    shongre_fail "$service_name is not running; start it with make dev"
    failed=1
    return
  fi
  tracked_pid="$(tr -dc '0-9' < "$pid_file")"
  if ! shongre_pid_is_running "$tracked_pid" || ! shongre_pid_belongs_to_project "$tracked_pid" "$service_name"; then
    shongre_fail "$service_name tracking is stale or invalid"
    failed=1
    return
  fi
  shongre_pass "$service_name process (PID $tracked_pid)"
}

require_http() {
  local label="$1" url="$2"
  if curl --silent --show-error --fail --max-time 5 "$url" >/dev/null 2>&1; then
    shongre_pass "$label $url"
  else
    shongre_fail "$label is not healthy at $url"
    failed=1
  fi
}

require_backend() {
  require_process backend
  require_http "Backend readiness" "http://${BACKEND_HOST}:${BACKEND_PORT}/readyz"
}

require_worker() {
  require_process worker
}

require_frontend() {
  require_process frontend
  require_http "Web" "http://${FRONTEND_HOST}:${FRONTEND_PORT}/"
}

require_metro() {
  require_process metro
  require_http "Metro" "http://${EXPO_HOST}:${EXPO_METRO_PORT}/status"
}

require_infrastructure_when_configured() {
  [[ "$BACKEND_DATA_MODE" == "database" ]] || {
    shongre_info "Supabase is not required while BACKEND_DATA_MODE=$BACKEND_DATA_MODE"
    return
  }
  if [[ "$DATABASE_INFRA_MODE" == "hosted" ]]; then
    shongre_pass "hosted database configuration (connectivity is exercised through the backend)"
    return
  fi
  if command -v supabase >/dev/null 2>&1 && supabase status --workdir "$SHONGRE_ROOT/backend" >/dev/null 2>&1; then
    shongre_pass "local Supabase services"
  else
    shongre_fail "local Supabase is required in database mode; run make infra-start"
    failed=1
  fi
}

case "$mode" in
  stack)
    require_backend
    require_worker
    require_frontend
    require_infrastructure_when_configured
    ;;
  backend)
    require_backend
    require_infrastructure_when_configured
    ;;
  mobile)
    require_backend
    require_worker
    require_metro
    require_infrastructure_when_configured
    ;;
  smoke)
    require_backend
    require_worker
    require_frontend
    require_http "Anonymous listings" "http://${BACKEND_HOST}:${BACKEND_PORT}${API_PREFIX}/listings"
    require_infrastructure_when_configured
    ;;
  *)
    shongre_fail "usage: scripts/health.sh <stack|backend|mobile|smoke>"
    exit 2
    ;;
esac

if (( failed )); then
  shongre_info "inspect make status and make logs, then retry"
  exit 1
fi
