#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"
cd "$SHONGRE_ROOT"

mode="${1:-web}"
"$SHONGRE_ROOT/scripts/env-check.sh"

started=()
ensure_service() {
  local service_name="$1" service_port="$2" status_line
  shift 2
  status_line="$("$SHONGRE_ROOT/scripts/service.sh" status "$service_name" "$service_port")" || return 1
  if [[ "$status_line" == RUNNING* ]]; then
    shongre_info "reusing tracked $service_name (${status_line#RUNNING })"
    return 0
  fi
  "$SHONGRE_ROOT/scripts/service.sh" start "$service_name" "$service_port" -- "$@"
  started+=("$service_name")
}

wait_http() {
  local label="$1" url="$2" attempt
  for attempt in {1..60}; do
    if curl --silent --fail --max-time 2 "$url" >/dev/null 2>&1; then
      shongre_pass "$label ready at $url"
      return 0
    fi
    sleep 0.5
  done
  shongre_fail "$label did not become ready at $url"
  return 1
}

cleanup() {
  for service_name in "${started[@]}"; do
    service_port="$(shongre_service_port "$service_name")"
    "$SHONGRE_ROOT/scripts/service.sh" stop "$service_name" "$service_port" || true
  done
}
trap cleanup INT TERM EXIT

case "$mode" in
  web)
    selected_services=(backend worker frontend)
    ;;
  mobile)
    selected_services=(backend worker metro)
    ;;
  all)
    selected_services=(backend worker frontend metro)
    ;;
  *) shongre_fail "usage: scripts/dev.sh <web|mobile|all>"; exit 2 ;;
esac

if [[ "$BACKEND_DATA_MODE" == "database" && "$DATABASE_INFRA_MODE" == "local" ]]; then
  shongre_info "database mode selected; ensuring local infrastructure"
  "$SHONGRE_ROOT/scripts/infra.sh" start
  # The CLI creates local API credentials when the stack starts. Import the
  # generated, ignored runtime file for the backend and worker started below.
  set -a
  source "$SHONGRE_ROOT/.runtime/supabase.env"
  set +a
  "$SHONGRE_ROOT/scripts/database.sh" migrate
elif [[ "$BACKEND_DATA_MODE" == "database" ]]; then
  shongre_info "hosted database mode selected; local Supabase will not be started"
fi

for service_name in "${selected_services[@]}"; do
  case "$service_name" in
    backend) ensure_service backend "$BACKEND_PORT" npm run dev --workspace=backend ;;
    worker) ensure_service worker none npm run dev:worker --workspace=backend ;;
    frontend) ensure_service frontend "$FRONTEND_PORT" npm run dev --workspace=frontend ;;
    metro) ensure_service metro "$EXPO_METRO_PORT" npm run start --workspace=mobile -- --port "$EXPO_METRO_PORT" ;;
  esac
done

for service_name in "${selected_services[@]}"; do
  case "$service_name" in
    backend) wait_http Backend "http://${BACKEND_HOST}:${BACKEND_PORT}/readyz" ;;
    frontend) wait_http Web "http://${FRONTEND_HOST}:${FRONTEND_PORT}/" ;;
    metro) wait_http Metro "http://${EXPO_HOST}:${EXPO_METRO_PORT}/status" ;;
  esac
done

shongre_info "development stack is ready; press Ctrl+C to stop only services started by this session"
[[ " ${selected_services[*]} " != *" frontend "* ]] || printf 'Shongre Web:  http://%s:%s\n' "$FRONTEND_HOST" "$FRONTEND_PORT"
printf 'Shongre API:  http://%s:%s%s\nReadiness:    http://%s:%s/readyz\n' "$BACKEND_HOST" "$BACKEND_PORT" "$API_PREFIX" "$BACKEND_HOST" "$BACKEND_PORT"
[[ " ${selected_services[*]} " != *" metro "* ]] || printf 'Expo Metro:   http://%s:%s\n' "$EXPO_HOST" "$EXPO_METRO_PORT"
"$SHONGRE_ROOT/scripts/status.sh"
while true; do
  sleep 2
  for service_name in "${selected_services[@]}"; do
    pid_file="$(shongre_pid_file "$service_name")"
    if [[ ! -f "$pid_file" ]] || ! shongre_pid_is_running "$(tr -dc '0-9' < "$pid_file")"; then
      shongre_fail "$service_name exited; inspect .runtime/logs/${service_name}.log"
      exit 1
    fi
  done
done
