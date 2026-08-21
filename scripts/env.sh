#!/usr/bin/env bash

# Safe environment loader for every root command.
# Precedence: exported shell values > .env.local > .env. The example file is
# documentation/initialization only and is never loaded at runtime.

if [[ "${SHONGRE_ENV_LOADED:-}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi
export SHONGRE_ENV_LOADED=1

SHONGRE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SHONGRE_ROOT

shongre_load_env_file() {
  local env_file="$1" line key value
  [[ -f "$env_file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    line="${line#export }"
    [[ "$line" == *"="* ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    key="${key//[[:space:]]/}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue

    # An explicitly exported value wins even when it is intentionally empty.
    if printenv "$key" >/dev/null 2>&1; then
      continue
    fi

    if [[ "$value" =~ ^\".*\"$ || "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi
    export "$key=$value"
  done < "$env_file"
}

shongre_load_env_file "$SHONGRE_ROOT/.env.local"
shongre_load_env_file "$SHONGRE_ROOT/.env"

# Derived URLs track port overrides. They are not persisted and contain no
# secrets. Production builds use the explicit PRODUCTION_* values instead.
if [[ -z "${VITE_API_URL:-}" && -n "${BACKEND_HOST:-}" && -n "${BACKEND_PORT:-}" ]]; then
  export VITE_API_URL="http://${BACKEND_HOST}:${BACKEND_PORT}${API_PREFIX:-/api/v1}"
fi
export NEXT_PUBLIC_DATA_MODE="${NEXT_PUBLIC_DATA_MODE:-${VITE_DATA_MODE:-demo}}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-${VITE_API_URL:-}}"
export NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-${VITE_APP_NAME:-Shongre}}"
if [[ -z "${CORS_ORIGIN:-}" && -n "${FRONTEND_HOST:-}" && -n "${FRONTEND_PORT:-}" ]]; then
  export CORS_ORIGIN="http://${FRONTEND_HOST}:${FRONTEND_PORT}"
fi
if [[ -z "${VITE_APP_URL:-}" && -n "${FRONTEND_HOST:-}" && -n "${FRONTEND_PORT:-}" ]]; then
  export VITE_APP_URL="http://${FRONTEND_HOST}:${FRONTEND_PORT}"
fi
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-${VITE_APP_URL:-}}"
export NEXT_PUBLIC_DEFAULT_COUNTRY_CODE="${NEXT_PUBLIC_DEFAULT_COUNTRY_CODE:-${VITE_DEFAULT_COUNTRY_CODE:-FR}}"
export NEXT_PUBLIC_DEFAULT_CURRENCY="${NEXT_PUBLIC_DEFAULT_CURRENCY:-${VITE_DEFAULT_CURRENCY:-EUR}}"
export NEXT_PUBLIC_DEFAULT_LOCALE="${NEXT_PUBLIC_DEFAULT_LOCALE:-${VITE_DEFAULT_LOCALE:-fr-FR}}"
export NEXT_PUBLIC_ENABLE_AI_FEATURES="${NEXT_PUBLIC_ENABLE_AI_FEATURES:-${VITE_ENABLE_AI_FEATURES:-false}}"
export NEXT_PUBLIC_ENABLE_MOCK_STORAGE="${NEXT_PUBLIC_ENABLE_MOCK_STORAGE:-${VITE_ENABLE_MOCK_STORAGE:-true}}"
if [[ -z "${FRONTEND_URL:-}" && -n "${FRONTEND_HOST:-}" && -n "${FRONTEND_PORT:-}" ]]; then
  export FRONTEND_URL="http://${FRONTEND_HOST}:${FRONTEND_PORT}"
fi
if [[ -z "${SUPABASE_URL:-}" && -n "${SUPABASE_HOST:-}" && -n "${SUPABASE_API_PORT:-}" ]]; then
  export SUPABASE_URL="http://${SUPABASE_HOST}:${SUPABASE_API_PORT}"
fi
if [[ -z "${EXPO_PUBLIC_API_URL:-}" && -n "${BACKEND_HOST:-}" && -n "${BACKEND_PORT:-}" ]]; then
  export EXPO_PUBLIC_API_URL="http://${BACKEND_HOST}:${BACKEND_PORT}${API_PREFIX:-/api/v1}"
fi
if [[ -z "${EXPO_PUBLIC_WEB_URL:-}" && -n "${FRONTEND_HOST:-}" && -n "${FRONTEND_PORT:-}" ]]; then
  export EXPO_PUBLIC_WEB_URL="http://${FRONTEND_HOST}:${FRONTEND_PORT}"
fi
if [[ -n "${EXPO_PUBLIC_WEB_URL:-}" ]]; then
  export EXPO_PUBLIC_PRIVACY_URL="${EXPO_PUBLIC_PRIVACY_URL:-${EXPO_PUBLIC_WEB_URL}/privacy}"
  export EXPO_PUBLIC_TERMS_URL="${EXPO_PUBLIC_TERMS_URL:-${EXPO_PUBLIC_WEB_URL}/terms}"
  export EXPO_PUBLIC_SUPPORT_URL="${EXPO_PUBLIC_SUPPORT_URL:-${EXPO_PUBLIC_WEB_URL}/support}"
  export EXPO_PUBLIC_ACCOUNT_DELETION_URL="${EXPO_PUBLIC_ACCOUNT_DELETION_URL:-${EXPO_PUBLIC_WEB_URL}/account/delete}"
fi
