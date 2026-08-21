#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

template="$SHONGRE_ROOT/backend/supabase/config.toml.template"
target="$SHONGRE_ROOT/backend/supabase/config.toml"
[[ -f "$template" ]] || { shongre_fail "missing $template"; exit 1; }

rendered="$(sed \
  -e "s|{{SUPABASE_HOST}}|$SUPABASE_HOST|g" \
  -e "s|{{SUPABASE_API_PORT}}|$SUPABASE_API_PORT|g" \
  -e "s|{{SUPABASE_DB_PORT}}|$SUPABASE_DB_PORT|g" \
  -e "s|{{SUPABASE_SHADOW_PORT}}|$SUPABASE_SHADOW_PORT|g" \
  -e "s|{{SUPABASE_REALTIME_PORT}}|$SUPABASE_REALTIME_PORT|g" \
  -e "s|{{SUPABASE_STUDIO_PORT}}|$SUPABASE_STUDIO_PORT|g" \
  -e "s|{{SUPABASE_INBUCKET_PORT}}|$SUPABASE_INBUCKET_PORT|g" \
  -e "s|{{SUPABASE_SMTP_PORT}}|$SUPABASE_SMTP_PORT|g" \
  -e "s|{{SUPABASE_POP3_PORT}}|$SUPABASE_POP3_PORT|g" \
  -e "s|{{SUPABASE_POOLER_PORT}}|$SUPABASE_POOLER_PORT|g" \
  -e "s|{{FRONTEND_URL}}|http://$FRONTEND_HOST:$FRONTEND_PORT|g" \
  -e "s|{{PRODUCTION_WEB_URL}}|$PRODUCTION_WEB_URL|g" \
  "$template")"

if printf '%s\n' "$rendered" | grep -Eq '\{\{[A-Z_]+'; then
  shongre_fail "unresolved Supabase template placeholder"
  exit 1
fi
if [[ "${1:-}" == "--check" ]]; then
  shongre_pass "Supabase template renders without unresolved values"
  exit 0
fi
printf '%s\n' "$rendered" > "$target"
