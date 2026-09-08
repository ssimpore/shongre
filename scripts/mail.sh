#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

if [[ "$APP_ENV" != local || "$DATABASE_INFRA_MODE" != local ]]; then
  shongre_fail "Mailpit commands require the local Supabase profile"
  exit 2
fi

mailpit_container() {
  docker ps -a \
    --filter "label=com.supabase.cli.workdir=$SHONGRE_ROOT/backend" \
    --filter "label=org.opencontainers.image.title=Mailpit" \
    --format '{{.ID}}'
}

require_exact_container() {
  local containers count
  containers="$(mailpit_container)"
  count="$(printf '%s\n' "$containers" | sed '/^$/d' | wc -l | tr -d ' ')"
  if [[ "$count" != 1 ]]; then
    shongre_fail "expected exactly one repository-owned Mailpit container, found $count"
    exit 1
  fi
  printf '%s' "$containers"
}

action="${1:-status}"
case "$action" in
  up)
    "$SHONGRE_ROOT/scripts/supabase.sh" up
    container="$(require_exact_container)"
    if [[ "$(docker inspect --format '{{.State.Running}}' "$container")" != true ]]; then
      docker start "$container" >/dev/null
    fi
    for _attempt in {1..30}; do
      if curl --silent --fail --max-time 2 "http://${SUPABASE_HOST}:${SUPABASE_INBUCKET_PORT}/" >/dev/null; then
        shongre_pass "Mailpit is ready at http://${SUPABASE_HOST}:${SUPABASE_INBUCKET_PORT}"
        exit 0
      fi
      sleep 0.2
    done
    shongre_fail "Mailpit did not become ready"
    exit 1
    ;;
  down)
    container="$(require_exact_container)"
    docker stop --time 10 "$container" >/dev/null
    shongre_pass "repository-owned Mailpit is stopped"
    ;;
  status)
    container="$(require_exact_container)"
    [[ "$(docker inspect --format '{{.State.Running}}' "$container")" == true ]] || {
      shongre_fail "Mailpit is stopped; run make mail-up"
      exit 1
    }
    curl --silent --fail --max-time 2 "http://${SUPABASE_HOST}:${SUPABASE_INBUCKET_PORT}/" >/dev/null
    shongre_pass "Mailpit UI and container are healthy"
    ;;
  *)
    shongre_fail "usage: scripts/mail.sh <up|down|status>"
    exit 2
    ;;
esac
