#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

printf '%-18s %-8s %-12s %s\n' SERVICE PORT STATE OWNER
printf '%-18s %-8s %-12s %s\n' '------------------' '--------' '------------' '-----'

print_port() {
  local service="$1" port="$2" pids owner='-'
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u | paste -sd, - || true)"
  if [[ -n "$pids" ]]; then
    owner="$(shongre_pid_command "${pids%%,*}")"
    printf '%-18s %-8s %-12s %s (PID %s)\n' "$service" "$port" OCCUPIED "${owner:0:72}" "$pids"
  else
    printf '%-18s %-8s %-12s %s\n' "$service" "$port" FREE "$owner"
  fi
}

print_port Frontend "$FRONTEND_PORT"
print_port Backend "$BACKEND_PORT"
print_port Metro "$EXPO_METRO_PORT"
print_port Expo-Web "$EXPO_WEB_PORT"
print_port Storybook "$STORYBOOK_PORT"
print_port Supabase-API "$SUPABASE_API_PORT"
print_port Supabase-DB "$SUPABASE_DB_PORT"
print_port Supabase-Studio "$SUPABASE_STUDIO_PORT"

