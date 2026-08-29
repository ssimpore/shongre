#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"
cd "$SHONGRE_ROOT"

action="${1:-}"

require_environment() {
  if ! "$SHONGRE_ROOT/scripts/env-check.sh" >/dev/null 2>&1; then
    "$SHONGRE_ROOT/scripts/env-check.sh" || true
    shongre_fail "database mutations require a valid root environment; run make env, then make env-check"
    exit 1
  fi
}

require_local() {
  require_environment
  if [[ "${APP_ENV:-}" != "local" ]]; then
    shongre_fail "refusing $action outside APP_ENV=local"
    exit 1
  fi
}

is_loopback_host() {
  case "$1" in
    localhost|127.*|::1|0.0.0.0) return 0 ;;
    *) return 1 ;;
  esac
}

assert_local_database_url() {
  local database_url="$1" identity host port database_name
  identity="$(DATABASE_URL="$database_url" node --input-type=module -e '
    const value = new URL(process.env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(value.protocol)) process.exit(2);
    const database = decodeURIComponent(value.pathname.replace(/^\//, ""));
    process.stdout.write([value.hostname, value.port || "5432", database].join("\t"));
  ' 2>/dev/null)" || {
    shongre_fail "DATABASE_URL must be a valid PostgreSQL URL"
    exit 1
  }
  IFS=$'\t' read -r host port database_name <<< "$identity"
  if ! is_loopback_host "$host"; then
    shongre_fail "refusing $action against non-local database host $host"
    shongre_info "use an explicit protected operational workflow for remote databases"
    exit 1
  fi
  if [[ ! "$database_name" =~ ^(postgres|shongre([_-](dev|local|test))?)$ ]]; then
    shongre_fail "refusing $action against suspicious local database name $database_name"
    shongre_info "expected postgres, shongre, shongre_dev, shongre_local, or shongre_test"
    exit 1
  fi
  shongre_pass "database target is local ($host:$port/$database_name)"
}

local_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    assert_local_database_url "$DATABASE_URL" >&2
    printf '%s' "$DATABASE_URL"
    return
  fi

  if ! command -v supabase >/dev/null 2>&1 || ! supabase status --workdir "$SHONGRE_ROOT/backend" >/dev/null 2>&1; then
    shongre_fail "no local database is configured or running"
    shongre_info "run make infra-start, or set DATABASE_URL to an explicit loopback development database"
    exit 1
  fi
  if ! is_loopback_host "$SUPABASE_HOST"; then
    shongre_fail "SUPABASE_HOST must be loopback for local database commands"
    exit 1
  fi
  printf 'postgresql://postgres:postgres@%s:%s/postgres' "$SUPABASE_HOST" "$SUPABASE_DB_PORT"
}

migration_database_url() {
  require_environment
  if [[ "$APP_ENV" == "local" ]]; then
    local_database_url
    return
  fi
  if [[ "${SHONGRE_REMOTE_MIGRATION_APPROVED:-}" != "true" ]]; then
    shongre_fail "remote migrations require the protected deployment workflow"
    shongre_info "SHONGRE_REMOTE_MIGRATION_APPROVED is set only by approved deployment automation"
    exit 1
  fi
  if [[ "$DATABASE_INFRA_MODE" != "hosted" || -z "${DATABASE_URL:-}" ]]; then
    shongre_fail "remote migrations require hosted database mode and DATABASE_URL"
    exit 1
  fi
  printf '%s' "$DATABASE_URL"
}

case "$action" in
  check)
    shongre_info "validating ordered migrations without a database connection"
    env -u DATABASE_URL npm run db:migrate --workspace=backend
    ;;
  migrate)
    resolved_database_url="$(migration_database_url)"
    DATABASE_URL="$resolved_database_url" \
      DATABASE_ENVIRONMENT_ID="$DATABASE_ENVIRONMENT_ID" \
      MIGRATION_APPROVAL="$ENVIRONMENT_ID" \
      npm run db:migrate --workspace=backend
    ;;
  diff)
    require_local
    command -v supabase >/dev/null 2>&1 || {
      shongre_fail "Supabase CLI is required for schema diff"
      exit 1
    }
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh"
    supabase db diff --workdir "$SHONGRE_ROOT/backend"
    ;;
  seed)
    require_local
    resolved_database_url="$(local_database_url)"
    DATABASE_URL="$resolved_database_url" ALLOW_DEMO_SEED=true npm run db:seed --workspace=backend
    ;;
  taxonomy-dry-run|taxonomy-import)
    require_local
    resolved_database_url="$(local_database_url)"
    taxonomy_args=()
    if [[ "$action" == "taxonomy-dry-run" ]]; then
      taxonomy_args+=(--dry-run)
    fi
    DATABASE_URL="$resolved_database_url" TAXONOMY_IMPORT_APPROVAL=local \
      npm run taxonomy:import:local --workspace=backend -- "${taxonomy_args[@]}"
    ;;
  reset)
    require_local
    if [[ -n "${DATABASE_URL:-}" ]]; then
      assert_local_database_url "$DATABASE_URL"
    fi
    is_loopback_host "$SUPABASE_HOST" || {
      shongre_fail "refusing reset because SUPABASE_HOST is not loopback"
      exit 1
    }
    command -v supabase >/dev/null 2>&1 || {
      shongre_fail "Supabase CLI is required; install it, then run make doctor"
      exit 1
    }
    command -v docker >/dev/null 2>&1 || {
      shongre_fail "Docker is required for a local Supabase reset"
      exit 1
    }
    docker info >/dev/null 2>&1 || {
      shongre_fail "Docker is installed but its daemon is not available"
      exit 1
    }
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh"
    shongre_info "resetting only backend/supabase on $SUPABASE_HOST:$SUPABASE_DB_PORT"
    env -u DATABASE_URL supabase db reset --workdir "$SHONGRE_ROOT/backend"
    ;;
  shell)
    require_local
    command -v psql >/dev/null 2>&1 || {
      shongre_fail "psql is required for make db-shell"
      exit 1
    }
    resolved_database_url="$(local_database_url)"
    exec psql -X "$resolved_database_url"
    ;;
  *)
    shongre_fail "usage: scripts/database.sh <check|migrate|diff|seed|taxonomy-dry-run|taxonomy-import|reset|shell>"
    exit 2
    ;;
esac
