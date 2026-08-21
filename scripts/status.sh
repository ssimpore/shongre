#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

printf '%-14s %-8s %-12s %s\n' SERVICE PORT STATUS PID
printf '%-14s %-8s %-12s %s\n' '--------------' '--------' '------------' '--------'
for entry in "frontend:$FRONTEND_PORT" "backend:$BACKEND_PORT" "metro:$EXPO_METRO_PORT"; do
  service_name="${entry%%:*}"
  service_port="${entry##*:}"
  status_line="$("$SHONGRE_ROOT/scripts/service.sh" status "$service_name" "$service_port")"
  printf '%-14s %-8s %-12s %s\n' "$service_name" "$service_port" "${status_line%% *}" "${status_line#* }"
done

