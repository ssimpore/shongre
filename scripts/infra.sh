#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"
cd "$SHONGRE_ROOT"

action="${1:-check}"
case "$action" in
  check|validate)
    [[ -f "$SHONGRE_ROOT/backend/Dockerfile" ]] || { shongre_fail "backend/Dockerfile missing"; exit 1; }
    [[ -f "$SHONGRE_ROOT/frontend/Dockerfile" ]] || { shongre_fail "frontend/Dockerfile missing"; exit 1; }
    [[ -f "$SHONGRE_ROOT/infrastructure/kubernetes/shongre-platform.yaml" ]] || { shongre_fail "production workload manifest missing"; exit 1; }
    [[ -f "$SHONGRE_ROOT/docs/operations/backup-restore.md" ]] || { shongre_fail "backup/restore runbook missing"; exit 1; }
    [[ -f "$SHONGRE_ROOT/backend/supabase/config.toml.template" ]] || { shongre_fail "Supabase config template missing"; exit 1; }
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh" --check
    shongre_pass "infrastructure configuration is valid"
    ;;
  config)
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh"
    shongre_pass "generated backend/supabase/config.toml from environment"
    ;;
  start)
    if [[ "$BACKEND_DATA_MODE" != "database" ]]; then
      shongre_info "infrastructure is NOT APPLICABLE while BACKEND_DATA_MODE=$BACKEND_DATA_MODE"
      exit 0
    fi
    command -v supabase >/dev/null 2>&1 || { shongre_fail "Supabase CLI is required in database mode"; exit 1; }
    command -v docker >/dev/null 2>&1 || { shongre_fail "Docker is required in database mode"; exit 1; }
    docker info >/dev/null 2>&1 || { shongre_fail "Docker daemon is unavailable; start Docker and retry"; exit 1; }
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh"
    supabase start --workdir "$SHONGRE_ROOT/backend"
    ;;
  stop)
    if command -v supabase >/dev/null 2>&1; then supabase stop --workdir "$SHONGRE_ROOT/backend"; else shongre_info "Supabase CLI unavailable"; fi
    ;;
  status|health)
    if command -v supabase >/dev/null 2>&1; then
      if supabase status --workdir "$SHONGRE_ROOT/backend"; then
        exit 0
      fi
      if [[ "$BACKEND_DATA_MODE" == "database" || "$action" == "health" ]]; then
        shongre_fail "local Supabase is not healthy; run make infra-start"
        exit 1
      fi
      shongre_info "Supabase is not running (not required in demo mode)"
    elif [[ "$BACKEND_DATA_MODE" == "database" || "$action" == "health" ]]; then
      shongre_fail "Supabase CLI is unavailable"
      exit 1
    else
      shongre_info "Supabase CLI unavailable (not required in demo mode)"
    fi
    ;;
  logs)
    shongre_info "use 'supabase status --workdir backend' for local service endpoints; container logs require Docker"
    ;;
  *) shongre_fail "unknown infrastructure action: $action"; exit 2 ;;
esac
