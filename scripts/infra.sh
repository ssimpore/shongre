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
    [[ -f "$SHONGRE_ROOT/compose.yaml" ]] || { shongre_fail "canonical hosted Compose topology missing"; exit 1; }
    [[ -f "$SHONGRE_ROOT/compose.local.yaml" ]] || { shongre_fail "loopback-only Compose override missing"; exit 1; }
    [[ -f "$SHONGRE_ROOT/infrastructure/cloudflare/README.md" ]] || { shongre_fail "Cloudflare Tunnel contract missing"; exit 1; }
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      SHONGRE_RUNTIME_ENV_FILE="$SHONGRE_ROOT/.env.example" \
        SHONGRE_FRONTEND_ENV_FILE="$SHONGRE_ROOT/.env.example" \
        docker compose --project-directory "$SHONGRE_ROOT" -f "$SHONGRE_ROOT/compose.yaml" --profile tunnel config --quiet
    else
      shongre_warn "Docker Compose unavailable; canonical topology syntax was not rendered locally"
    fi
    [[ -f "$SHONGRE_ROOT/docs/operations/backup-restore.md" ]] || { shongre_fail "backup/restore runbook missing"; exit 1; }
    [[ -f "$SHONGRE_ROOT/backend/supabase/config.toml.template" ]] || { shongre_fail "Supabase config template missing"; exit 1; }
    "$SHONGRE_ROOT/scripts/render-supabase-config.sh" --check
    shongre_pass "infrastructure configuration is valid"
    ;;
  *) shongre_fail "usage: scripts/infra.sh <check|validate>"; exit 2 ;;
esac
