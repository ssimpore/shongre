#!/usr/bin/env bash

# Safe environment loader for every root command.
#
# Select a profile with make <target> ENVIRONMENT=local|dev|staging|prod or SHONGRE_ENV.
# APP_ENV is also accepted when explicitly exported before this file is sourced.
# Precedence is:
#
#   exported shell values
#     > .env.<profile>.local
#     > .env.<profile>
#     > .env (local only)
#
# Local uses .env.local > .runtime/supabase.env > .env. We do not load those
# files for any non-local profile, preventing local-only values or
# secrets from leaking into test or hosted targets. The example file remains
# documentation/initialization only and is never loaded at runtime.

SHONGRE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SHONGRE_ROOT
source "$SHONGRE_ROOT/scripts/lib/environment-profile.sh"
requested_environment="$(shongre_environment_profile "${SHONGRE_ENV:-${APP_ENV:-local}}")" || { return 1 2>/dev/null || exit 1; }
if [[ -n "${SHONGRE_ENV_LOADED:-}" ]]; then
  if [[ "$SHONGRE_ENV_LOADED" == "$requested_environment" && "${APP_ENV:-}" == "$requested_environment" ]]; then
    return 0 2>/dev/null || exit 0
  fi
  printf 'A different environment was already loaded. Use a fresh shell and command-scoped ENVIRONMENT selection; do not reuse exported profile values.\n' >&2
  return 1 2>/dev/null || exit 1
fi
if [[ -n "${APP_ENV:-}" && "$APP_ENV" != "$requested_environment" ]]; then
  printf 'APP_ENV conflicts with the selected profile. Use a fresh shell with matching canonical APP_ENV.\n' >&2
  return 1 2>/dev/null || exit 1
fi

# Project-scoped command-line tools (including the Supabase CLI) are preferred
# over machine-global installations so every checkout uses the locked version.
if [[ -d "$SHONGRE_ROOT/node_modules/.bin" ]]; then
  export PATH="$SHONGRE_ROOT/node_modules/.bin:$PATH"
fi

case "$requested_environment" in
  local)
    SHONGRE_ENV=local
    environment_files=(
      "$SHONGRE_ROOT/.env.local"
      "$SHONGRE_ROOT/.runtime/supabase.env"
      "$SHONGRE_ROOT/.env"
    )
    ;;
  *)
    SHONGRE_ENV="$requested_environment"
    environment_files=(
      "$SHONGRE_ROOT/.env.${SHONGRE_ENV}.local"
      "$SHONGRE_ROOT/.env.${SHONGRE_ENV}"
    )
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
    # Files cannot change the loader's selection or completion marker.
    case "$key" in SHONGRE_ENV|SHONGRE_ENV_LOADED|SHONGRE_ROOT) continue ;; esac

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
if [[ "${APP_ENV:-}" != "$SHONGRE_ENV" ]]; then
  printf 'The selected environment profile must supply matching APP_ENV. Run make env for local, or configure the selected hosted profile.\n' >&2
  return 1 2>/dev/null || exit 1
fi

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
if [[ "$SHONGRE_ENV" == "local" ]]; then
  default_client_data_mode=api
  default_mock_storage=false
else
  default_client_data_mode=demo
  default_mock_storage=true
fi
export NEXT_PUBLIC_DATA_MODE="${NEXT_PUBLIC_DATA_MODE:-$default_client_data_mode}"
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
export NEXT_PUBLIC_ENABLE_MOCK_STORAGE="${NEXT_PUBLIC_ENABLE_MOCK_STORAGE:-$default_mock_storage}"
if [[ "$SHONGRE_ENV" == "local" && -z "${SUPABASE_URL:-}" && -n "${SUPABASE_HOST:-}" && -n "${SUPABASE_API_PORT:-}" ]]; then
  export SUPABASE_URL="http://${SUPABASE_HOST}:${SUPABASE_API_PORT}"
fi
if [[ -z "${PUBLIC_MEDIA_ASSET_BASE_URL:-}" && "${APP_ENV:-}" == "local" && -n "${SUPABASE_URL:-}" ]]; then
  export PUBLIC_MEDIA_ASSET_BASE_URL="${SUPABASE_URL%/}/storage/v1/object/public/listing-media/local-seed/demo-library"
fi
if [[ -z "${PUBLIC_CATEGORY_MEDIA_BASE_URL:-}" && "${APP_ENV:-}" == "local" && -n "${SUPABASE_URL:-}" ]]; then
  export PUBLIC_CATEGORY_MEDIA_BASE_URL="${SUPABASE_URL%/}/storage/v1/object/public/listing-media/local-seed/categories"
fi
export EXPO_PUBLIC_APP_ENV="${EXPO_PUBLIC_APP_ENV:-${APP_ENV:-}}"
export EXPO_PUBLIC_ENVIRONMENT_ID="${EXPO_PUBLIC_ENVIRONMENT_ID:-${ENVIRONMENT_ID:-}}"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-${API_URL:-}${API_PREFIX:-/api/v1}}"
export EXPO_PUBLIC_FR_URL="${EXPO_PUBLIC_FR_URL:-${PUBLIC_FR_URL:-}}"
export EXPO_PUBLIC_INTL_URL="${EXPO_PUBLIC_INTL_URL:-${PUBLIC_INTL_URL:-}}"
export SHONGRE_ENV_LOADED="$SHONGRE_ENV"
