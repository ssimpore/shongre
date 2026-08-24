#!/usr/bin/env bash

set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

if ! "$SHONGRE_ROOT/scripts/env-check.sh" >/dev/null 2>&1; then
  "$SHONGRE_ROOT/scripts/env-check.sh" || true
  shongre_fail "status requires a valid root environment; run make env, then make env-check"
  exit 1
fi

printf 'Git: %s\n' "$(git -C "$SHONGRE_ROOT" branch --show-current 2>/dev/null || printf 'detached')"
if [[ -f "$SHONGRE_ROOT/.env" || -f "$SHONGRE_ROOT/.env.local" ]]; then
  printf 'Environment: .env present | APP_ENV=%s | web=%s | backend=%s | mobile=%s\n\n' \
    "$APP_ENV" "$NEXT_PUBLIC_DATA_MODE" "$BACKEND_DATA_MODE" "$EXPO_PUBLIC_DATA_MODE"
else
  printf 'Environment: root environment missing (run make env)\n\n'
fi

printf '%-14s %-8s %-12s %s\n' SERVICE PORT STATUS PID
printf '%-14s %-8s %-12s %s\n' '--------------' '--------' '------------' '--------'
failed=0
for entry in "frontend:$FRONTEND_PORT" "backend:$BACKEND_PORT" "worker:none" "metro:$EXPO_METRO_PORT"; do
  service_name="${entry%%:*}"
  service_port="${entry##*:}"
  status_line="$("$SHONGRE_ROOT/scripts/service.sh" status "$service_name" "$service_port")" || failed=1
  printf '%-14s %-8s %-12s %s\n' "$service_name" "$service_port" "${status_line%% *}" "${status_line#* }"
done

printf '\n'
"$SHONGRE_ROOT/scripts/ports.sh"
printf '\nInfrastructure: '
if command -v supabase >/dev/null 2>&1 && supabase status --workdir "$SHONGRE_ROOT/backend" >/dev/null 2>&1; then
  printf 'RUNNING\n'
elif [[ "$BACKEND_DATA_MODE" == "database" ]]; then
  printf 'UNAVAILABLE (run make infra-start)\n'
  failed=1
else
  printf 'NOT APPLICABLE in %s mode\n' "$BACKEND_DATA_MODE"
fi

exit "$failed"
