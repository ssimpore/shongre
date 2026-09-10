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
# The first-party API relay must recognize the isolated browser origin, never
# inherit the interactive marketplace listener from the local profile.
export SHONGRE_MARKETPLACE_ORIGIN="$E2E_BASE_URL"
export PUBLIC_FR_URL="$E2E_BASE_URL"
export PUBLIC_INTL_URL="$E2E_BASE_URL"
export NEXT_PUBLIC_FR_URL="$E2E_BASE_URL"
export NEXT_PUBLIC_INTL_URL="$E2E_BASE_URL"
export PLAYWRIGHT_REUSE_EXISTING_SERVER=1
export SHONGRE_DISABLE_DEV_ASSET_HEADERS=1
export SHONGRE_E2E_ALLOW_HTTP=1
export SHONGRE_E2E_ALLOW_LOCAL_HOSTS=1
export NEXT_TELEMETRY_DISABLED=1
# The harness builds and serves a production Next artifact while APP_ENV stays
# `test`. NODE_ENV selects framework mechanics only; leaving the test profile's
# value here makes Next enter an unsupported hybrid mode during prerendering.
export NODE_ENV=production
unset NO_COLOR

# Keep the isolated app underneath Next's detected monorepo tracing root. An
# app copied to the operating-system temp directory builds successfully, but
# Next omits its standalone entrypoint because it sits outside that root.
mkdir -p "$SHONGRE_ROOT/.runtime"
e2e_root="$(mktemp -d "$SHONGRE_ROOT/.runtime/e2e.XXXXXX")"
e2e_server_pid=""
e2e_backend_pid=""
cleanup() {
  local e2e_pid
  for e2e_pid in "$e2e_server_pid" "$e2e_backend_pid"; do
    [[ -n "$e2e_pid" ]] || continue
    shongre_stop_process_tree "$e2e_pid" "isolated-e2e" || return 1
    wait "$e2e_pid" 2>/dev/null || true
  done
  [[ ! -d "$e2e_root" ]] || find "$e2e_root" -depth -delete
}
trap cleanup EXIT INT TERM

export PLAYWRIGHT_NO_COPY_PROMPT=1
[[ "$APP_ENV" == "test" ]] || { shongre_fail "browser tests require APP_ENV=test"; exit 1; }
  export PUBLIC_FR_URL="http://fr.localhost:${E2E_FRONTEND_PORT}"
  export PUBLIC_INTL_URL="http://intl.localhost:${E2E_FRONTEND_PORT}"
  # Exercise direct navigation on the same canonical market host as SSR.
  # The bare listener host is not a France route alias when origins are split.
  export E2E_BASE_URL="$PUBLIC_FR_URL"
  export PLAYWRIGHT_BASE_URL="$E2E_BASE_URL"
  export SHONGRE_MARKETPLACE_ORIGIN="$E2E_BASE_URL"
  export NEXT_PUBLIC_FR_URL="$PUBLIC_FR_URL"
  export NEXT_PUBLIC_INTL_URL="$PUBLIC_INTL_URL"
  export SHONGRE_FACTURATION_ORIGIN="http://facturation.localhost:${E2E_FRONTEND_PORT}"
  export DEMO_ACCOUNT_PASSWORD="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
  export E2E_API_PORT_FILE="$e2e_root/api-port"
  export E2E_ACCOUNTS_FILE="$e2e_root/accounts.json"
  NODE_ENV=test BACKEND_DATA_MODE=demo \
    TSX_TSCONFIG_PATH="$SHONGRE_ROOT/backend/tsconfig.json" \
    node --import tsx backend/tests/fixtures/browser-api-server.ts >"$e2e_root/api.log" 2>&1 &
  e2e_backend_pid=$!
  # A cold tsx load of the complete API graph can take more than one minute on
  # development machines. Keep a finite two-minute startup deadline while the
  # port file remains the readiness proof.
  for _ in {1..120}; do
    [[ ! -s "$E2E_API_PORT_FILE" ]] || break
    kill -0 "$e2e_backend_pid" 2>/dev/null || break
    sleep 1
  done
  if [[ ! -s "$E2E_API_PORT_FILE" ]]; then
    shongre_fail "isolated test API did not start"
    [[ ! -f "$e2e_root/api.log" ]] || sed -n '1,160p' "$e2e_root/api.log" >&2
    exit 1
  fi
  export API_URL="http://127.0.0.1:$(<"$E2E_API_PORT_FILE")"
export NEXT_PUBLIC_API_URL="$API_URL/api/v1"

mkdir -p "$e2e_root/frontend"
rsync -a \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  "$SHONGRE_ROOT/frontend/" "$e2e_root/frontend/"
ln -s "$SHONGRE_ROOT/node_modules" "$e2e_root/node_modules"
# npm hoists most workspace dependencies to the root, but not always: whether a
# package lands in `frontend/node_modules` depends on how it was installed, and
# a package that did would be unresolvable here with only the root link. That
# failed as `Module not found: Can't resolve 'maplibre-gl'` in a build whose
# only difference from a working one was where npm had put a directory, so the
# isolated copy mirrors the real resolution layout instead of assuming one.
[[ ! -d "$SHONGRE_ROOT/frontend/node_modules" ]] ||
  ln -s "$SHONGRE_ROOT/frontend/node_modules" "$e2e_root/frontend/node_modules"
cp "$SHONGRE_ROOT/.env.example" "$e2e_root/.env.example"

# The isolated build calls `next build` directly, so the `prebuild` hook that
# normally stages MapLibre's worker under `public/` never runs. That copy is
# generated and git-ignored, so on a fresh checkout it would simply be absent —
# and the resulting app renders an interactive map that never draws a vector
# tile, which is the failure this file most wants not to reproduce silently.
node "$SHONGRE_ROOT/frontend/scripts/sync-map-worker.mjs"
rsync -a "$SHONGRE_ROOT/frontend/public/vendor/" "$e2e_root/frontend/public/vendor/"

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
  if curl --silent --fail --max-time 2 "http://${FRONTEND_HOST}:${E2E_FRONTEND_PORT}/healthz" >/dev/null 2>&1; then
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
shongre_info "phase 1/2: regular browser tests with engine-safe parallelism"

requested_projects=()
forwarded_args=()
requested_grep=""
requested_grep_invert=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --grep | -g | --grep-invert)
      [[ "$#" -ge 2 ]] || { shongre_fail "$1 requires a pattern"; exit 1; }
      if [[ "$1" == "--grep-invert" ]]; then requested_grep_invert="$2"; else requested_grep="$2"; fi
      shift 2
      ;;
    --grep=*) requested_grep="${1#--grep=}"; shift ;;
    --grep-invert=*) requested_grep_invert="${1#--grep-invert=}"; shift ;;
    --project)
      if [[ "$#" -lt 2 ]]; then
        shongre_fail "--project requires a Playwright project name"
        exit 1
      fi
      requested_projects+=("$2")
      shift 2
      ;;
    --project=*)
      requested_projects+=("${1#--project=}")
      shift
      ;;
    *)
      forwarded_args+=("$1")
      shift
      ;;
  esac
done

project_is_requested() {
  local project="$1"
  if [[ "${#requested_projects[@]}" -eq 0 ]]; then
    return 0
  fi
  local requested
  for requested in "${requested_projects[@]}"; do
    [[ "$requested" != "$project" ]] || return 0
  done
  return 1
}

if [[ "${#requested_projects[@]}" -gt 0 ]]; then
  for requested_project in "${requested_projects[@]}"; do
    case "$requested_project" in
      chromium | firefox | webkit) ;;
      *)
        shongre_fail "unsupported Playwright project '$requested_project'"
        exit 1
        ;;
    esac
  done
fi

darwin_major=0
if [[ "$(uname -s)" == "Darwin" ]]; then
  darwin_major="$(uname -r | cut -d. -f1)"
fi
firefox_can_launch=1
if [[ "$darwin_major" -ge 27 && "${FORCE_FIREFOX_E2E:-0}" != "1" ]]; then
  firefox_can_launch=0
fi
if [[ "$firefox_can_launch" == "0" ]] && project_is_requested firefox; then
  if [[ "${#requested_projects[@]}" -gt 0 ]]; then
    shongre_fail "Firefox cannot launch on this host; set FORCE_FIREFOX_E2E=1 only to retest the upstream fix"
    exit 1
  fi
fi

targeted_run=0
[[ -z "$requested_grep" && -z "$requested_grep_invert" ]] || targeted_run=1
if [[ "${#forwarded_args[@]}" -gt 0 ]]; then
  for argument in "${forwarded_args[@]}"; do
    case "$argument" in
      --grep | --grep=* | *.spec.ts | */e2e/*) targeted_run=1 ;;
    esac
  done
fi

if [[ "$targeted_run" == "1" ]]; then
  non_blink_shards="${NON_BLINK_E2E_SHARDS:-1}"
  non_blink_serial_shards="${NON_BLINK_SERIAL_E2E_SHARDS:-1}"
else
  non_blink_shards="${NON_BLINK_E2E_SHARDS:-40}"
  non_blink_serial_shards="${NON_BLINK_SERIAL_E2E_SHARDS:-3}"
fi
for shard_count in "$non_blink_shards" "$non_blink_serial_shards"; do
  if [[ ! "$shard_count" =~ ^[1-9][0-9]*$ || "$shard_count" -gt 200 ]]; then
    shongre_fail "non-Blink E2E shard counts must be integers between 1 and 200"
    exit 1
  fi
done

run_playwright_project() {
  local project="$1"
  local workers="$2"
  local grep_mode="$3"
  shift 3
  local phase="regular"
  [[ "$grep_mode" != "--grep" ]] || phase="serial"
  local phase_filter
  phase_filter="$(node --input-type=module -e '
    import { e2eFilter } from "./scripts/lib/e2e-filter.mjs";
    process.stdout.write(e2eFilter(...process.argv.slice(1)));
  ' "$phase" "$requested_grep" "$requested_grep_invert")"
  if [[ "${#forwarded_args[@]}" -gt 0 ]]; then
    npm run test:e2e --workspace=frontend -- \
      --grep "$phase_filter" --project="$project" --workers="$workers" \
      --pass-with-no-tests "$@" "${forwarded_args[@]}"
  else
    npm run test:e2e --workspace=frontend -- \
      --grep "$phase_filter" --project="$project" --workers="$workers" \
      --pass-with-no-tests "$@"
  fi
}

run_sharded_project() {
  local project="$1"
  local shard_count="$2"
  local grep_mode="$3"
  local label="$4"
  local shard
  for ((shard = 1; shard <= shard_count; shard += 1)); do
    shongre_info "$project $label shard $shard/$shard_count"
    run_playwright_project \
      "$project" 1 "$grep_mode" "--shard=$shard/$shard_count"
  done
}

if project_is_requested chromium; then
  run_playwright_project chromium 2 --grep-invert
fi
if [[ "$firefox_can_launch" == "1" ]] && project_is_requested firefox; then
  run_sharded_project firefox "$non_blink_shards" --grep-invert regular
fi
if project_is_requested webkit; then
  # Long non-Blink matrices can deadlock a browser process after sustained
  # context creation, leaving both page.goto and context teardown stuck. Small
  # sequential shards recycle the process without dropping coverage.
  run_sharded_project webkit "$non_blink_shards" --grep-invert regular
fi

shongre_info "phase 2/2: multi-route and multi-persona audits without compiler contention"
if project_is_requested chromium; then
  run_playwright_project chromium 1 --grep
fi
if [[ "$firefox_can_launch" == "1" ]] && project_is_requested firefox; then
  run_sharded_project firefox "$non_blink_serial_shards" --grep serial
fi
if project_is_requested webkit; then
  run_sharded_project webkit "$non_blink_serial_shards" --grep serial
fi
