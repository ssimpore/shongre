#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"
cd "$SHONGRE_ROOT"

mode="${1:-web}"
if [[ "$APP_ENV" == production ]]; then
  shongre_fail "production cannot run through the development launcher; use make deploy ENVIRONMENT=prod"
  exit 2
fi
"$SHONGRE_ROOT/scripts/env-check.sh"

started=()
start_service() {
  local service_name="$1" service_port="$2"
  shift 2
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
  if (( ${#started[@]} == 0 )); then
    return
  fi
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

# Infrastructure/configuration checks happen before tracked applications stop.
if [[ "$BACKEND_DATA_MODE" == database && "$DATABASE_INFRA_MODE" == local ]]; then
  "$SHONGRE_ROOT/scripts/supabase.sh" up
  set -a
  source "$SHONGRE_ROOT/.runtime/supabase.env"
  set +a
fi

expected_fingerprint="$(node "$SHONGRE_ROOT/scripts/runtime-fingerprint.mjs")"
reusable=true
for service_name in "${selected_services[@]}"; do
  fingerprint_file="$(shongre_pid_file "$service_name").fingerprint"
  if [[ ! -f "$fingerprint_file" || "$(cat "$fingerprint_file")" != "$expected_fingerprint" ]]; then
    reusable=false
  fi
done
health_mode=stack
[[ "$mode" == mobile ]] && health_mode=mobile
if [[ "$reusable" == true ]] && "$SHONGRE_ROOT/scripts/health.sh" "$health_mode" >/dev/null 2>&1 && \
  { [[ "$mode" != all ]] || "$SHONGRE_ROOT/scripts/health.sh" mobile >/dev/null 2>&1; }; then
  shongre_pass "the selected development stack is already healthy with matching configuration and migrations"
  "$SHONGRE_ROOT/scripts/service-urls.sh"
  exit 0
fi

make --no-print-directory stop-all
if [[ "$BACKEND_DATA_MODE" == database && "$DATABASE_INFRA_MODE" == local ]]; then
  "$SHONGRE_ROOT/scripts/database.sh" migrate
  "$SHONGRE_ROOT/scripts/database.sh" seed
fi

for service_name in "${selected_services[@]}"; do
  case "$service_name" in
    backend) start_service backend "$BACKEND_PORT" npm run dev --workspace=backend ;;
    worker) start_service worker none npm run dev:worker --workspace=backend ;;
    frontend) start_service frontend "$FRONTEND_PORT" npm run dev --workspace=frontend ;;
    metro) start_service metro "$EXPO_METRO_PORT" npm run start --workspace=mobile -- --port "$EXPO_METRO_PORT" ;;
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
