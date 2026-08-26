#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/env.sh"
source "$root/scripts/utils.sh"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-shongre-${APP_ENV}}"
export SHONGRE_RUNTIME_ENV_FILE="${SHONGRE_RUNTIME_ENV_FILE:-.env.local}"
export SHONGRE_FRONTEND_ENV_FILE="${SHONGRE_FRONTEND_ENV_FILE:-.env.example}"
compose=(docker compose --project-directory "$root" -f "$root/compose.yaml" --profile tunnel)

action="${1:-status}"
case "$action" in
  status)
    "${compose[@]}" ps cloudflared
    ;;
  health)
    "${compose[@]}" exec -T backend node -e '
      const response = await fetch("http://cloudflared:2000/metrics");
      if (!response.ok) throw new Error(`metrics returned ${response.status}`);
      const metrics = await response.text();
      const values = [...metrics.matchAll(/^cloudflared_tunnel_ha_connections(?:\{[^}]*\})?\s+([0-9.]+)/gm)].map((match) => Number(match[1]));
      if (!values.some((value) => value > 0)) throw new Error("cloudflared has no active HA connection");
    '
    shongre_pass "cloudflared reports at least one active Tunnel connection"
    ;;
  logs)
    "${compose[@]}" logs --tail=200 cloudflared
    ;;
  *)
    shongre_fail "usage: scripts/tunnel.sh <status|health|logs>"
    exit 2
    ;;
esac
