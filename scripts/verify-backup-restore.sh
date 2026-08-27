#!/usr/bin/env bash

set -euo pipefail

if [[ "${ALLOW_BACKUP_RESTORE_TEST:-}" != "true" ]]; then
  echo "Refusing restore test without ALLOW_BACKUP_RESTORE_TEST=true" >&2
  exit 1
fi

required=(BACKUP_SOURCE_DATABASE_URL RESTORE_TEST_DATABASE_URL BACKUP_RESTORE_EVIDENCE_FILE)
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "$key is required" >&2
    exit 1
  fi
done

command -v pg_dump >/dev/null || { echo "pg_dump is required" >&2; exit 1; }
command -v pg_restore >/dev/null || { echo "pg_restore is required" >&2; exit 1; }
command -v psql >/dev/null || { echo "psql is required" >&2; exit 1; }

source_identity="$({ DATABASE_URL="$BACKUP_SOURCE_DATABASE_URL" node --input-type=module -e 'const u=new URL(process.env.DATABASE_URL); console.log(`${u.hostname}:${u.port || "5432"}${u.pathname}`);'; })"
target_identity="$({ DATABASE_URL="$RESTORE_TEST_DATABASE_URL" node --input-type=module -e 'const u=new URL(process.env.DATABASE_URL); console.log(`${u.hostname}:${u.port || "5432"}${u.pathname}`);'; })"
target_database="$({ DATABASE_URL="$RESTORE_TEST_DATABASE_URL" node --input-type=module -e 'const u=new URL(process.env.DATABASE_URL); console.log(u.pathname.slice(1));'; })"

if [[ "$source_identity" == "$target_identity" ]]; then
  echo "Source and restore-test databases must be different" >&2
  exit 1
fi
if [[ ! "$target_database" =~ (restore|dr[_-]?test) ]]; then
  echo "Restore target database name must contain restore or dr_test" >&2
  exit 1
fi

restore_workspace="$(mktemp -d)"
trap 'rm -rf "$restore_workspace"' EXIT
dump_path="$restore_workspace/shongre.dump"
summary_path="$restore_workspace/summary.txt"
storage_evidence_path="$restore_workspace/storage-evidence.json"
database_started_at="$(date +%s)"

PGCONNECT_TIMEOUT=15 pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$dump_path" \
  "$BACKUP_SOURCE_DATABASE_URL"

# This intentionally replaces only the explicitly named, guarded restore-test
# database. It never targets the source database.
PGCONNECT_TIMEOUT=15 pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$RESTORE_TEST_DATABASE_URL" \
  "$dump_path"

PGCONNECT_TIMEOUT=15 psql -X -v ON_ERROR_STOP=1 -qAt \
  "$RESTORE_TEST_DATABASE_URL" \
  -c "SELECT jsonb_build_object(
        'migration_count', (SELECT count(*) FROM supabase_migrations.schema_migrations),
        'profile_count', (SELECT count(*) FROM public.profiles),
        'listing_count', (SELECT count(*) FROM public.listings),
        'order_count', (SELECT count(*) FROM public.orders)
      );" > "$summary_path"

database_rto_seconds="$(( $(date +%s) - database_started_at ))"
storage_status="MANUAL_VERIFICATION_REQUIRED"
storage_summary=""
if [[ -n "${STORAGE_BACKUP_DOWNLOAD_URL:-}" || -n "${STORAGE_RESTORE_UPLOAD_URL:-}" || -n "${STORAGE_RESTORE_DOWNLOAD_URL:-}" ]]; then
  for key in STORAGE_BACKUP_DOWNLOAD_URL STORAGE_RESTORE_UPLOAD_URL STORAGE_RESTORE_DOWNLOAD_URL STORAGE_RESTORE_TARGET_ID; do
    if [[ -z "${!key:-}" ]]; then
      echo "$key is required when automated storage restore verification is configured" >&2
      exit 1
    fi
  done
  STORAGE_RESTORE_EVIDENCE_FILE="$storage_evidence_path" \
    node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/verify-storage-restore.mjs"
  storage_status="PASS"
  storage_summary="$(tr -d '\n' < "$storage_evidence_path")"
fi

mkdir -p "$(dirname "$BACKUP_RESTORE_EVIDENCE_FILE")"
{
  echo "verified_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "database_restore=PASS"
  echo "target_database=$target_database"
  echo "dump_bytes=$(wc -c < "$dump_path" | tr -d ' ')"
  echo "database_rto_seconds=$database_rto_seconds"
  echo "integrity_summary=$(cat "$summary_path")"
  echo "storage_restore=$storage_status"
  [[ -z "$storage_summary" ]] || echo "storage_integrity_summary=$storage_summary"
} > "$BACKUP_RESTORE_EVIDENCE_FILE"
chmod 0600 "$BACKUP_RESTORE_EVIDENCE_FILE"

echo "Backup restored and queried successfully; evidence written without credentials."
