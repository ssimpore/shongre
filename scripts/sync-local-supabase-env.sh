#!/usr/bin/env bash

set -euo pipefail

SHONGRE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$SHONGRE_ROOT/node_modules/.bin:$PATH"

command -v supabase >/dev/null 2>&1 || {
  printf 'Supabase CLI is unavailable. Run npm install first.\n' >&2
  exit 1
}

status_output="$(supabase status --workdir "$SHONGRE_ROOT/backend" -o env)"

anon_key=""
api_url=""
database_url=""
jwt_secret=""
publishable_key=""
secret_key=""
service_role_key=""

while IFS='=' read -r key value; do
  [[ "$key" =~ ^[A-Z_]+$ ]] || continue
  value="${value%$'\r'}"
  if [[ "$value" =~ ^\".*\"$ || "$value" =~ ^\'.*\'$ ]]; then
    value="${value:1:${#value}-2}"
  fi
  case "$key" in
    ANON_KEY) anon_key="$value" ;;
    API_URL) api_url="$value" ;;
    DB_URL) database_url="$value" ;;
    JWT_SECRET) jwt_secret="$value" ;;
    PUBLISHABLE_KEY) publishable_key="$value" ;;
    SECRET_KEY) secret_key="$value" ;;
    SERVICE_ROLE_KEY) service_role_key="$value" ;;
  esac
done <<< "$status_output"

anon_key="${anon_key:-$publishable_key}"
service_role_key="${service_role_key:-$secret_key}"

for required_value in api_url database_url anon_key service_role_key jwt_secret; do
  if [[ -z "${!required_value}" ]]; then
    printf 'Supabase status did not provide %s.\n' "$required_value" >&2
    exit 1
  fi
done

runtime_dir="$SHONGRE_ROOT/.runtime"
mkdir -p "$runtime_dir"
umask 077
runtime_file="$(mktemp "$runtime_dir/supabase.env.XXXXXX")"
{
  printf '# Generated from the local Supabase CLI. Do not edit or commit.\n'
  printf 'DATABASE_URL=%s\n' "$database_url"
  printf 'SUPABASE_URL=%s\n' "$api_url"
  printf 'SUPABASE_ANON_KEY=%s\n' "$anon_key"
  printf 'SUPABASE_SERVICE_ROLE_KEY=%s\n' "$service_role_key"
  printf 'JWT_SECRET=%s\n' "$jwt_secret"
} > "$runtime_file"
mv "$runtime_file" "$runtime_dir/supabase.env"

printf 'Local Supabase runtime credentials synchronized.\n'
