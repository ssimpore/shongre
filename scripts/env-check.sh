#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

if [[ ! -f "$SHONGRE_ROOT/.env" && ! -f "$SHONGRE_ROOT/.env.local" && ! -f "$SHONGRE_ROOT/.env.${SHONGRE_ENV}" ]]; then
  shongre_fail "No root environment file exists for SHONGRE_ENV=$SHONGRE_ENV. Run: make env"
  exit 1
fi

required=(
  APP_ENV ENVIRONMENT_ID API_ENVIRONMENT_ID DATABASE_ENVIRONMENT_ID SUPABASE_ENVIRONMENT_ID STORAGE_ENVIRONMENT_ID
  PUBLIC_FR_URL PUBLIC_INTL_URL API_URL FRONTEND_HOST FRONTEND_PORT E2E_FRONTEND_PORT BACKEND_HOST BACKEND_PORT EXPO_HOST SUPABASE_HOST API_PREFIX
  NEXT_PUBLIC_DATA_MODE BACKEND_DATA_MODE DATABASE_INFRA_MODE EXPO_PUBLIC_DATA_MODE
  NEXT_PUBLIC_APP_ENV NEXT_PUBLIC_ENVIRONMENT_ID NEXT_PUBLIC_FR_URL NEXT_PUBLIC_INTL_URL NEXT_PUBLIC_API_URL
  EXPO_PUBLIC_APP_ENV EXPO_PUBLIC_ENVIRONMENT_ID EXPO_PUBLIC_FR_URL EXPO_PUBLIC_INTL_URL EXPO_PUBLIC_API_URL
  PAYMENT_MODE EMAIL_MODE AI_MODE ANALYTICS_MODE
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
  local|test|preview|development|staging|production) ;;
  *) shongre_fail "APP_ENV must be local, test, preview, development, staging, or production"; failed=1 ;;
esac
case "$NEXT_PUBLIC_DATA_MODE" in
  demo|api) ;;
  *) shongre_fail "NEXT_PUBLIC_DATA_MODE must be demo or api"; failed=1 ;;
esac
case "${BACKEND_DATA_MODE:-}" in
  demo|database) ;;
  *) shongre_fail "BACKEND_DATA_MODE must be demo or database"; failed=1 ;;
esac
case "${DATABASE_INFRA_MODE:-}" in
  local|hosted) ;;
  *) shongre_fail "DATABASE_INFRA_MODE must be local or hosted"; failed=1 ;;
esac
case "$EXPO_PUBLIC_DATA_MODE" in
  demo|api) ;;
  *) shongre_fail "EXPO_PUBLIC_DATA_MODE must be demo or api"; failed=1 ;;
esac

case "$SHONGRE_ENV:$APP_ENV" in
  local:local|test:test|preview:preview|development:development|staging:staging|production:production) ;;
  *)
    shongre_fail "SHONGRE_ENV=$SHONGRE_ENV requires APP_ENV=$SHONGRE_ENV"
    failed=1
    ;;
esac

if [[ "$BACKEND_DATA_MODE" == "database" && "$DATABASE_INFRA_MODE" == "hosted" ]]; then
  for key in DATABASE_URL SUPABASE_PROJECT_REF EXPECTED_SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
    if [[ -z "${!key:-}" ]]; then
      shongre_fail "$key is required for hosted database mode"
      failed=1
    fi
  done
fi

for fingerprint in API_ENVIRONMENT_ID DATABASE_ENVIRONMENT_ID SUPABASE_ENVIRONMENT_ID STORAGE_ENVIRONMENT_ID NEXT_PUBLIC_ENVIRONMENT_ID EXPO_PUBLIC_ENVIRONMENT_ID; do
  if [[ "${!fingerprint:-}" != "${ENVIRONMENT_ID:-}" ]]; then
    shongre_fail "$fingerprint must match ENVIRONMENT_ID"
    failed=1
  fi
done
if [[ "${NEXT_PUBLIC_APP_ENV:-}" != "${APP_ENV:-}" || "${EXPO_PUBLIC_APP_ENV:-}" != "${APP_ENV:-}" ]]; then
  shongre_fail "public client APP_ENV values must match APP_ENV"
  failed=1
fi

expected_modes=""
case "$APP_ENV" in
  local) expected_modes="test console mock off" ;;
  test) expected_modes="test console mock test" ;;
  preview) expected_modes="test sandbox development test" ;;
  development) expected_modes="test sandbox development development" ;;
  staging) expected_modes="test sandbox staging staging" ;;
  production) expected_modes="live live production production" ;;
esac
read -r expected_payment expected_email expected_ai expected_analytics <<< "$expected_modes"
for pair in \
  "PAYMENT_MODE:$expected_payment" \
  "EMAIL_MODE:$expected_email" \
  "AI_MODE:$expected_ai" \
  "ANALYTICS_MODE:$expected_analytics"; do
  name="${pair%%:*}"
  expected="${pair#*:}"
  if [[ "${!name:-}" != "$expected" ]]; then
    shongre_fail "$name must be $expected for APP_ENV=$APP_ENV"
    failed=1
  fi
done

if ! APP_ENV="${APP_ENV:-}" PUBLIC_FR_URL="${PUBLIC_FR_URL:-}" PUBLIC_INTL_URL="${PUBLIC_INTL_URL:-}" API_URL="${API_URL:-}" NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}" EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-}" node --input-type=module -e '
  const names = ["PUBLIC_FR_URL", "PUBLIC_INTL_URL", "API_URL"];
  const urls = Object.fromEntries(names.map((name) => [name, new URL(process.env[name])]));
  for (const [name, url] of Object.entries(urls)) {
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error(`${name} must be a credential-free HTTP(S) origin`);
    }
    if (!["local", "test"].includes(process.env.APP_ENV) && url.protocol !== "https:") {
      throw new Error(`${name} must use HTTPS outside local/test`);
    }
  }
  for (const name of ["NEXT_PUBLIC_API_URL", "EXPO_PUBLIC_API_URL"]) {
    const url = new URL(process.env[name]);
    if (url.origin !== urls.API_URL.origin || url.pathname.replace(/\/$/, "") !== "/api/v1") {
      throw new Error(`${name} must equal API_URL plus /api/v1`);
    }
  }
'; then
  shongre_fail "deployment URL configuration is invalid or cross-environment"
  failed=1
fi
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
