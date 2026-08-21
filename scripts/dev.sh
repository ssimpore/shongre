#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

mode="${1:-web}"
"$SHONGRE_ROOT/scripts/env-check.sh"

start_backend() {
  "$SHONGRE_ROOT/scripts/service.sh" start backend "$BACKEND_PORT" -- \
    npm run dev --workspace=backend
}
start_frontend() {
  "$SHONGRE_ROOT/scripts/service.sh" start frontend "$FRONTEND_PORT" -- \
    npm run dev --workspace=frontend
}
start_metro() {
  "$SHONGRE_ROOT/scripts/service.sh" start metro "$EXPO_METRO_PORT" -- \
    npm run start --workspace=mobile -- --port "$EXPO_METRO_PORT"
}

started=()
cleanup() {
  for service_name in "${started[@]}"; do
    service_port="$(shongre_service_port "$service_name")"
    "$SHONGRE_ROOT/scripts/service.sh" stop "$service_name" "$service_port" || true
  done
}
trap cleanup INT TERM EXIT

case "$mode" in
  web)
    start_backend; started+=(backend)
    start_frontend; started+=(frontend)
    ;;
  mobile)
    start_backend; started+=(backend)
    start_metro; started+=(metro)
    ;;
  all)
    start_backend; started+=(backend)
    start_frontend; started+=(frontend)
    start_metro; started+=(metro)
    ;;
  *) shongre_fail "usage: scripts/dev.sh <web|mobile|all>"; exit 2 ;;
esac

shongre_info "development stack is running; press Ctrl+C to stop only this session's services"
"$SHONGRE_ROOT/scripts/status.sh"
while true; do
  sleep 5
  for service_name in "${started[@]}"; do
    pid_file="$(shongre_pid_file "$service_name")"
    if [[ ! -f "$pid_file" ]] || ! shongre_pid_is_running "$(tr -dc '0-9' < "$pid_file")"; then
      shongre_fail "$service_name exited; inspect .runtime/logs/${service_name}.log"
      exit 1
    fi
  done
done
