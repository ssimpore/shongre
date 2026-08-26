#!/usr/bin/env bash

# Safe environment loader for every root command.
#
# Select a profile with SHONGRE_ENV=local|test|preview|development|staging|production. APP_ENV is also
# accepted when it was explicitly exported before this file is sourced.
# Precedence is:
#
#   exported shell values
#     > .env.<profile>.local
#     > .env.<profile>
#     > .env
#
# Local development uses .env.local > .env. We intentionally do not load the
# generic .env.local for any non-local profile, preventing local-only values or
# secrets from leaking into test or hosted targets. The example file remains
# documentation/initialization only and is never loaded at runtime.

if [[ "${SHONGRE_ENV_LOADED:-}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi
export SHONGRE_ENV_LOADED=1

SHONGRE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SHONGRE_ROOT

# Project-scoped command-line tools (including the Supabase CLI) are preferred
# over machine-global installations so every checkout uses the locked version.
if [[ -d "$SHONGRE_ROOT/node_modules/.bin" ]]; then
  export PATH="$SHONGRE_ROOT/node_modules/.bin:$PATH"
fi

requested_environment="${SHONGRE_ENV:-${APP_ENV:-local}}"
case "$requested_environment" in
  local)
    SHONGRE_ENV=local
    environment_files=(
      "$SHONGRE_ROOT/.env.local"
      "$SHONGRE_ROOT/.runtime/supabase.env"
      "$SHONGRE_ROOT/.env"
    )
    ;;
  test)
    SHONGRE_ENV=test
    environment_files=(
      "$SHONGRE_ROOT/.env.test.local"
      "$SHONGRE_ROOT/.env.test"
      "$SHONGRE_ROOT/.env"
    )
    ;;
  preview)
    SHONGRE_ENV=preview
    environment_files=(
      "$SHONGRE_ROOT/.env.preview.local"
      "$SHONGRE_ROOT/.env.preview"
      "$SHONGRE_ROOT/.env"
    )
    ;;
  development)
    SHONGRE_ENV=development
    environment_files=(
      "$SHONGRE_ROOT/.env.development.local"
      "$SHONGRE_ROOT/.env.development"
      "$SHONGRE_ROOT/.env"
    )
    ;;
  staging)
    SHONGRE_ENV=staging
    environment_files=(
      "$SHONGRE_ROOT/.env.staging.local"
      "$SHONGRE_ROOT/.env.staging"
      "$SHONGRE_ROOT/.env"
    )
    ;;
  production)
    SHONGRE_ENV=production
    environment_files=(
      "$SHONGRE_ROOT/.env.production.local"
      "$SHONGRE_ROOT/.env.production"
      "$SHONGRE_ROOT/.env"
    )
    ;;
  *)
    printf 'Invalid SHONGRE_ENV: %s (expected local, test, preview, development, staging, or production)\n' "$requested_environment" >&2
    return 1 2>/dev/null || exit 1
    ;;
esac
export SHONGRE_ENV

# Android tooling does not discover the default macOS SDK location reliably
# outside Android Studio. Respect an explicit value, otherwise expose the
# standard per-user installation used by the Android command-line tools.
if [[ -z "${ANDROID_HOME:-}" && -d "${HOME}/Library/Android/sdk" ]]; then
  export ANDROID_HOME="${HOME}/Library/Android/sdk"
fi
if [[ -z "${ANDROID_SDK_ROOT:-}" && -n "${ANDROID_HOME:-}" ]]; then
  export ANDROID_SDK_ROOT="${ANDROID_HOME}"
fi

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

for environment_file in "${environment_files[@]}"; do
  shongre_load_env_file "$environment_file"
done

# Derived local URLs track port overrides. Hosted environments must supply
# their deployment URLs explicitly and contain no hostname defaults in source.
if [[ -z "${E2E_FRONTEND_PORT:-}" && "${FRONTEND_PORT:-}" =~ ^[0-9]+$ ]]; then
  export E2E_FRONTEND_PORT="$((FRONTEND_PORT + 110))"
fi
if [[ "$SHONGRE_ENV" == "local" ]]; then
  export ENVIRONMENT_ID="${ENVIRONMENT_ID:-shongre-local}"
  export DATABASE_ENVIRONMENT_ID="${DATABASE_ENVIRONMENT_ID:-${ENVIRONMENT_ID}}"
  export PUBLIC_FR_URL="${PUBLIC_FR_URL:-http://${FRONTEND_HOST}:${FRONTEND_PORT}}"
  export PUBLIC_INTL_URL="${PUBLIC_INTL_URL:-http://${FRONTEND_HOST}:${FRONTEND_PORT}}"
  export API_URL="${API_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}}"
fi
export NEXT_PUBLIC_DATA_MODE="${NEXT_PUBLIC_DATA_MODE:-demo}"
export DATABASE_INFRA_MODE="${DATABASE_INFRA_MODE:-local}"
export NEXT_PUBLIC_APP_ENV="${NEXT_PUBLIC_APP_ENV:-${APP_ENV:-}}"
export NEXT_PUBLIC_ENVIRONMENT_ID="${NEXT_PUBLIC_ENVIRONMENT_ID:-${ENVIRONMENT_ID:-}}"
export NEXT_PUBLIC_FR_URL="${NEXT_PUBLIC_FR_URL:-${PUBLIC_FR_URL:-}}"
export NEXT_PUBLIC_INTL_URL="${NEXT_PUBLIC_INTL_URL:-${PUBLIC_INTL_URL:-}}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-${API_URL:-}${API_PREFIX:-/api/v1}}"
export NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Shongre}"
if [[ -z "${CORS_ORIGIN:-}" && -n "${PUBLIC_FR_URL:-}" && -n "${PUBLIC_INTL_URL:-}" ]]; then
  export CORS_ORIGIN="${PUBLIC_FR_URL},${PUBLIC_INTL_URL}"
fi
export NEXT_PUBLIC_DEFAULT_COUNTRY_CODE="${NEXT_PUBLIC_DEFAULT_COUNTRY_CODE:-FR}"
export NEXT_PUBLIC_DEFAULT_CURRENCY="${NEXT_PUBLIC_DEFAULT_CURRENCY:-EUR}"
export NEXT_PUBLIC_DEFAULT_LOCALE="${NEXT_PUBLIC_DEFAULT_LOCALE:-fr-FR}"
export NEXT_PUBLIC_ENABLE_AI_FEATURES="${NEXT_PUBLIC_ENABLE_AI_FEATURES:-false}"
export NEXT_PUBLIC_ENABLE_MOCK_STORAGE="${NEXT_PUBLIC_ENABLE_MOCK_STORAGE:-true}"
if [[ -z "${SUPABASE_URL:-}" && -n "${SUPABASE_HOST:-}" && -n "${SUPABASE_API_PORT:-}" ]]; then
  export SUPABASE_URL="http://${SUPABASE_HOST}:${SUPABASE_API_PORT}"
fi
export EXPO_PUBLIC_APP_ENV="${EXPO_PUBLIC_APP_ENV:-${APP_ENV:-}}"
export EXPO_PUBLIC_ENVIRONMENT_ID="${EXPO_PUBLIC_ENVIRONMENT_ID:-${ENVIRONMENT_ID:-}}"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-${API_URL:-}${API_PREFIX:-/api/v1}}"
export EXPO_PUBLIC_FR_URL="${EXPO_PUBLIC_FR_URL:-${PUBLIC_FR_URL:-}}"
export EXPO_PUBLIC_INTL_URL="${EXPO_PUBLIC_INTL_URL:-${PUBLIC_INTL_URL:-}}"
