#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"
cd "$SHONGRE_ROOT"

"$SHONGRE_ROOT/scripts/env-check.sh" >/dev/null

listener_pids="$(lsof -nP -iTCP:"$E2E_FRONTEND_PORT" -sTCP:LISTEN -t 2>/dev/null | sort -u || true)"
if [[ -n "$listener_pids" ]]; then
  shongre_fail "dedicated Playwright port $E2E_FRONTEND_PORT is already occupied by PID(s) $(printf '%s' "$listener_pids" | paste -sd, -)"
  shongre_info "set E2E_FRONTEND_PORT to a free port; the interactive Web server is never reused"
  exit 1
fi

export FRONTEND_PORT="$E2E_FRONTEND_PORT"
export PORT="$E2E_FRONTEND_PORT"
export E2E_BASE_URL="http://${FRONTEND_HOST}:${E2E_FRONTEND_PORT}"
export PUBLIC_FR_URL="$E2E_BASE_URL"
export PUBLIC_INTL_URL="$E2E_BASE_URL"
export NEXT_PUBLIC_FR_URL="$E2E_BASE_URL"
export NEXT_PUBLIC_INTL_URL="$E2E_BASE_URL"
export NEXT_PUBLIC_DATA_MODE=demo
export PLAYWRIGHT_REUSE_EXISTING_SERVER=1
export SHONGRE_DISABLE_DEV_ASSET_HEADERS=1
export SHONGRE_E2E_ALLOW_HTTP=1
export SHONGRE_E2E_ALLOW_LOCAL_HOSTS=1
export NEXT_TELEMETRY_DISABLED=1
unset NO_COLOR

# Keep the isolated app underneath Next's detected monorepo tracing root. An
# app copied to the operating-system temp directory builds successfully, but
# Next omits its standalone entrypoint because it sits outside that root.
mkdir -p "$SHONGRE_ROOT/.runtime"
e2e_root="$(mktemp -d "$SHONGRE_ROOT/.runtime/e2e.XXXXXX")"
e2e_server_pid=""
cleanup() {
  if [[ -n "$e2e_server_pid" ]] && kill -0 "$e2e_server_pid" 2>/dev/null; then
    kill "$e2e_server_pid" 2>/dev/null || true
    wait "$e2e_server_pid" 2>/dev/null || true
  fi
  [[ ! -d "$e2e_root" ]] || find "$e2e_root" -depth -delete
}
trap cleanup EXIT INT TERM

mkdir -p "$e2e_root/frontend"
rsync -a \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  "$SHONGRE_ROOT/frontend/" "$e2e_root/frontend/"
ln -s "$SHONGRE_ROOT/node_modules" "$e2e_root/node_modules"
cp "$SHONGRE_ROOT/.env.example" "$e2e_root/.env.example"

shongre_info "building an isolated Webpack production checkout"
node "$SHONGRE_ROOT/node_modules/next/dist/bin/next" build "$e2e_root/frontend" --webpack

source_map_count="$({ find "$e2e_root/frontend/.next/static" -type f -name '*.map' -print 2>/dev/null || true; } | wc -l | tr -d ' ')"
if [[ "$source_map_count" -eq 0 ]]; then
  shongre_fail "production browser source maps were not generated"
  exit 1
fi
shongre_info "verified $source_map_count production browser source maps before runtime packaging"

standalone_output="$e2e_root/frontend/.next/standalone"
standalone_server="$(
  find "$standalone_output" -path '*/node_modules' -prune -o \
    -type f -name 'server.js' -print -quit 2>/dev/null || true
)"
if [[ -z "$standalone_server" ]]; then
  shongre_fail "Next did not produce the expected standalone server"
  exit 1
fi
standalone_root="$(dirname "$standalone_server")"
mkdir -p "$standalone_root/.next/static" "$standalone_root/public"
rsync -a "$e2e_root/frontend/.next/static/" "$standalone_root/.next/static/"
rsync -a "$e2e_root/frontend/public/" "$standalone_root/public/"

server_log="$e2e_root/standalone.log"
(
  cd "$standalone_root"
  HOSTNAME="$FRONTEND_HOST" PORT="$E2E_FRONTEND_PORT" exec node server.js
) >"$server_log" 2>&1 &
e2e_server_pid=$!

server_ready=0
for _ in {1..60}; do
  if curl --silent --fail --max-time 2 "$E2E_BASE_URL" >/dev/null 2>&1; then
    server_ready=1
    break
  fi
  if ! kill -0 "$e2e_server_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done
if [[ "$server_ready" != "1" ]]; then
  shongre_fail "isolated standalone server did not become ready"
  [[ ! -f "$server_log" ]] || sed -n '1,160p' "$server_log" >&2
  exit 1
fi

shongre_info "running Playwright against the isolated standalone server at $E2E_BASE_URL"
shongre_info "phase 1/2: regular browser tests with bounded parallelism"
npm run test:e2e --workspace=frontend -- --grep-invert '@serial' --pass-with-no-tests "$@"
shongre_info "phase 2/2: multi-route and multi-persona audits without compiler contention"
npm run test:e2e --workspace=frontend -- --grep '@serial' --workers=1 --pass-with-no-tests "$@"
