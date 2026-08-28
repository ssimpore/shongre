#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/utils.sh"

environment="${1:-}"
manifest_path="${2:-}"
mode="${3:-deploy}"
case "$environment" in development|staging|production) ;; *) shongre_fail "environment must be development, staging, or production"; exit 2 ;; esac
case "$mode" in deploy|rollback) ;; *) shongre_fail "mode must be deploy or rollback"; exit 2 ;; esac
[[ -f "$manifest_path" ]] || { shongre_fail "release manifest not found"; exit 1; }

for variable in SHONGRE_RUNTIME_ENV_FILE SHONGRE_FRONTEND_ENV_FILE CLOUDFLARE_TUNNEL_TOKEN_FILE; do
  [[ -n "${!variable:-}" && -f "${!variable}" ]] || { shongre_fail "$variable must name an existing host-managed file"; exit 1; }
done

expected_environment_id="shongre-${environment}"
node "$root/scripts/validate-deployment-env.mjs" \
  "$environment" "$expected_environment_id" \
  "$SHONGRE_FRONTEND_ENV_FILE" "$SHONGRE_RUNTIME_ENV_FILE" \
  "$CLOUDFLARE_TUNNEL_TOKEN_FILE"
node "$root/scripts/release-manifest.mjs" validate "$manifest_path" "${RELEASE_SHA:?RELEASE_SHA is required}"

readarray -t release_values < <(node --input-type=module - "$manifest_path" <<'NODE'
import { readFileSync } from "node:fs";
const manifest = JSON.parse(readFileSync(process.argv[2], "utf8"));
console.log(manifest.images.frontend.reference);
console.log(manifest.images.backend.reference);
NODE
)
export FRONTEND_IMAGE="${release_values[0]}"
export BACKEND_IMAGE="${release_values[1]}"
[[ "$FRONTEND_IMAGE" =~ @sha256:[0-9a-f]{64}$ ]] || { shongre_fail "frontend image is not digest-pinned"; exit 1; }
[[ "$BACKEND_IMAGE" =~ @sha256:[0-9a-f]{64}$ ]] || { shongre_fail "backend image is not digest-pinned"; exit 1; }

export COMPOSE_PROJECT_NAME="shongre-${environment}"
export SHONGRE_PULL_POLICY=always
compose=(docker compose --project-directory "$root" -f "$root/compose.yaml" --profile tunnel)
state_root="${SHONGRE_DEPLOY_STATE_ROOT:-/var/lib/shongre}/${environment}"
mkdir -p "$state_root"
lock_directory="$state_root/deploy.lock"
if ! mkdir "$lock_directory" 2>/dev/null; then
  shongre_fail "another ${environment} deployment or migration is already running"
  exit 1
fi
trap 'rmdir "$lock_directory" 2>/dev/null || true' EXIT

"${compose[@]}" config --quiet
docker pull "$FRONTEND_IMAGE"
docker pull "$BACKEND_IMAGE"
docker pull cloudflare/cloudflared:2026.5.2@sha256:12ff5c6992a9863db4da270746af7c244bcaee49353039af8104268a18d6c4f0

if [[ "$mode" == "deploy" ]]; then
  if [[ "$environment" == "production" ]]; then
    shongre_info "validating production configuration and restricted release evidence"
    node "$root/scripts/production-readiness.mjs" --require-evidence \
      --backend-env-file "$SHONGRE_RUNTIME_ENV_FILE" \
      --frontend-env-file "$SHONGRE_FRONTEND_ENV_FILE"
  fi
  shongre_info "running the release-bundled forward migration exactly once"
  "${compose[@]}" run --rm --no-deps \
    -e "MIGRATION_APPROVAL=$expected_environment_id" \
    backend node dist/migrate.js
else
  shongre_info "application rollback leaves the database schema forward-compatible and unchanged"
fi

default_replicas=1
if [[ "$environment" == "staging" || "$environment" == "production" ]]; then
  default_replicas=2
fi
backend_replicas="${BACKEND_REPLICAS:-$default_replicas}"
frontend_replicas="${FRONTEND_REPLICAS:-$default_replicas}"
worker_replicas="${WORKER_REPLICAS:-$default_replicas}"
for replica_count in "$backend_replicas" "$frontend_replicas" "$worker_replicas"; do
  [[ "$replica_count" =~ ^[1-9][0-9]*$ ]] || {
    shongre_fail "application replica counts must be positive integers"
    exit 1
  }
done

"${compose[@]}" up --detach --no-build --remove-orphans --wait \
  --scale "backend=$backend_replicas" \
  --scale "worker=$worker_replicas" \
  --scale "frontend=$frontend_replicas" \
  --scale "cloudflared=${CLOUDFLARED_REPLICAS:-2}" \
  backend worker frontend cloudflared
"${compose[@]}" exec -T frontend node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
"${compose[@]}" exec -T backend node -e "fetch('http://127.0.0.1:4000/readyz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" SHONGRE_ENV="$environment" \
  SHONGRE_RUNTIME_ENV_FILE="$SHONGRE_RUNTIME_ENV_FILE" \
  SHONGRE_FRONTEND_ENV_FILE="$SHONGRE_FRONTEND_ENV_FILE" \
  CLOUDFLARE_TUNNEL_TOKEN_FILE="$CLOUDFLARE_TUNNEL_TOKEN_FILE" \
  "$root/scripts/tunnel.sh" health

install -m 0644 "$manifest_path" "$state_root/current-release.json"
printf '%s\t%s\t%s\t%s\tbackend=%s\tworker=%s\tfrontend=%s\n' \
  "$(date -u +%FT%TZ)" "$mode" "$RELEASE_SHA" "${GITHUB_ACTOR:-local}" \
  "$backend_replicas" "$worker_replicas" "$frontend_replicas" \
  >> "$state_root/deployments.log"
shongre_pass "$mode completed for $environment at the exact release digests"
