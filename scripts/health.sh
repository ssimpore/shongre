#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

failed=0
check_http() {
  local label="$1" url="$2"
  if curl --silent --show-error --fail --max-time 3 "$url" >/dev/null 2>&1; then
    shongre_pass "$label $url"
  else
    shongre_warn "$label is not responding at $url"
    failed=1
  fi
}

check_if_running() {
  local service_name="$1" url="$2" pid_file
  pid_file="$(shongre_pid_file "$service_name")"
  if [[ -f "$pid_file" ]] && shongre_pid_is_running "$(tr -dc '0-9' < "$pid_file")"; then
    check_http "$service_name" "$url"
  else
    shongre_info "$service_name is not running (NOT APPLICABLE)"
  fi
}

check_if_running backend "http://${BACKEND_HOST}:${BACKEND_PORT}/health"
check_if_running frontend "http://${FRONTEND_HOST}:${FRONTEND_PORT}/"
check_if_running metro "http://${EXPO_HOST}:${EXPO_METRO_PORT}/status"

if command -v supabase >/dev/null 2>&1; then
  if supabase status --workdir "$SHONGRE_ROOT/backend" >/dev/null 2>&1; then
    shongre_pass "Supabase local services"
  else
    shongre_info "Supabase is not running (NOT APPLICABLE in demo mode)"
  fi
else
  shongre_info "Supabase CLI is not installed (OPTIONAL in demo mode)"
fi

exit "$failed"

