#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

if [[ ! -f "$SHONGRE_ROOT/.env" && ! -f "$SHONGRE_ROOT/.env.local" ]]; then
  shongre_fail "No root .env or .env.local exists. Run: make env"
  exit 1
fi

required=(
  APP_ENV FRONTEND_HOST FRONTEND_PORT E2E_FRONTEND_PORT BACKEND_HOST BACKEND_PORT EXPO_HOST SUPABASE_HOST API_PREFIX
  NEXT_PUBLIC_DATA_MODE BACKEND_DATA_MODE EXPO_PUBLIC_DATA_MODE
  EXPO_METRO_PORT EXPO_WEB_PORT STORYBOOK_PORT SUPABASE_API_PORT
  SUPABASE_DB_PORT SUPABASE_SHADOW_PORT SUPABASE_REALTIME_PORT
  SUPABASE_STUDIO_PORT SUPABASE_INBUCKET_PORT SUPABASE_SMTP_PORT
  SUPABASE_POP3_PORT SUPABASE_POOLER_PORT IOS_BUNDLE_IDENTIFIER
  ANDROID_PACKAGE_NAME APP_VERSION IOS_BUILD_NUMBER ANDROID_VERSION_CODE
)
ports=(
  FRONTEND_PORT E2E_FRONTEND_PORT BACKEND_PORT EXPO_METRO_PORT EXPO_WEB_PORT STORYBOOK_PORT
  SUPABASE_API_PORT SUPABASE_DB_PORT SUPABASE_SHADOW_PORT
  SUPABASE_REALTIME_PORT SUPABASE_STUDIO_PORT SUPABASE_INBUCKET_PORT
  SUPABASE_SMTP_PORT SUPABASE_POP3_PORT SUPABASE_POOLER_PORT
)

failed=0
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    shongre_fail "$key is required"
    failed=1
  fi
done

case "${APP_ENV:-}" in
  development|test|staging|production) ;;
  *) shongre_fail "APP_ENV must be development, test, staging, or production"; failed=1 ;;
esac
case "$NEXT_PUBLIC_DATA_MODE" in
  demo|api) ;;
  *) shongre_fail "NEXT_PUBLIC_DATA_MODE must be demo or api"; failed=1 ;;
esac
case "${BACKEND_DATA_MODE:-}" in
  demo|database) ;;
  *) shongre_fail "BACKEND_DATA_MODE must be demo or database"; failed=1 ;;
esac
case "$EXPO_PUBLIC_DATA_MODE" in
  demo|api) ;;
  *) shongre_fail "EXPO_PUBLIC_DATA_MODE must be demo or api"; failed=1 ;;
esac
if [[ "${API_PREFIX:-}" != "/api/v1" ]]; then
  shongre_fail "API_PREFIX is fixed at /api/v1 by the canonical OpenAPI contract"
  failed=1
fi
if [[ "$NEXT_PUBLIC_DATA_MODE" == "api" && -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  shongre_fail "NEXT_PUBLIC_API_URL is required when NEXT_PUBLIC_DATA_MODE=api"
  failed=1
fi
if [[ "$EXPO_PUBLIC_DATA_MODE" == "api" && -z "${EXPO_PUBLIC_API_URL:-}" ]]; then
  shongre_fail "EXPO_PUBLIC_API_URL is required when EXPO_PUBLIC_DATA_MODE=api"
  failed=1
fi

seen_port_values=()
seen_port_names=()
for key in "${ports[@]}"; do
  value="${!key:-}"
  if [[ ! "$value" =~ ^[0-9]+$ ]] || (( value < 1 || value > 65535 )); then
    shongre_fail "$key must be an integer from 1 to 65535"
    failed=1
    continue
  fi
  for index in "${!seen_port_values[@]}"; do
    if [[ "${seen_port_values[$index]}" == "$value" ]]; then
      shongre_fail "$key conflicts with ${seen_port_names[$index]} on port $value"
      failed=1
    fi
  done
  seen_port_values+=("$value")
  seen_port_names+=("$key")
done

if env | cut -d= -f1 | grep -Eq '^(VITE|EXPO_PUBLIC)_(.*SECRET|.*TOKEN|.*PASSWORD|.*PRIVATE|DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY)$'; then
  shongre_fail "A secret-like variable uses a browser/mobile public prefix"
  failed=1
fi

if (( failed )); then
  exit 1
fi

shongre_pass "environment is valid; explicit shell overrides are preserved"
