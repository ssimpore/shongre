#!/usr/bin/env bash

set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"
cd "$SHONGRE_ROOT"

failed=0

printf 'Core tools\n'
for command_name in git make bash node npm curl lsof rsync; do
  shongre_require_command "$command_name" || failed=1
done

if command -v node >/dev/null 2>&1; then
  if node --input-type=module -e '
    import packageJson from "./package.json" with { type: "json" };
    const match = /^>=(\d+)\s+<(\d+)$/.exec(packageJson.engines.node);
    const major = Number(process.versions.node.split(".")[0]);
    if (!match || major < Number(match[1]) || major >= Number(match[2])) process.exit(1);
  ' >/dev/null 2>&1; then
    shongre_pass "Node.js $(node --version) satisfies package.json engines"
  else
    shongre_fail "Node.js $(node --version) is outside package.json engines; use .nvmrc"
    failed=1
  fi
fi
if command -v npm >/dev/null 2>&1; then
  npm_major="$(npm --version | cut -d. -f1)"
  required_npm_major="$(node -p "require('./package.json').engines.npm.match(/[0-9]+/)[0]" 2>/dev/null || printf '10')"
  if [[ "$npm_major" =~ ^[0-9]+$ ]] && (( npm_major >= required_npm_major )); then
    shongre_pass "npm $(npm --version) satisfies package.json engines"
  else
    shongre_fail "npm $(npm --version) is older than the required npm $required_npm_major"
    failed=1
  fi
fi

printf '\nRepository\n'
for path_name in package.json package-lock.json Makefile frontend/package.json backend/package.json mobile/package.json backend/supabase/migrations; do
  if [[ -e "$SHONGRE_ROOT/$path_name" ]]; then
    shongre_pass "$path_name"
  else
    shongre_fail "$path_name is missing"
    failed=1
  fi
done
if [[ -d "$SHONGRE_ROOT/node_modules" && -x "$SHONGRE_ROOT/node_modules/.bin/tsx" ]]; then
  shongre_pass "npm workspace dependencies installed"
else
  shongre_fail "npm workspace dependencies are missing; run make install"
  failed=1
fi

printf '\nEnvironment\n'
environment_valid=1
if "$SHONGRE_ROOT/scripts/env-check.sh"; then
  shongre_pass "root environment configuration"
else
  environment_valid=0
  failed=1
fi
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && [[ -x "$SHONGRE_ROOT/node_modules/.bin/tsx" ]]; then
  if (cd "$SHONGRE_ROOT" && env -u DATABASE_URL npm run db:migrate --workspace=backend >/dev/null 2>&1); then
    shongre_pass "ordered migration files"
  else
    shongre_fail "migration validation failed; run make migrations-check"
    failed=1
  fi
fi

printf '\nApplication ports\n'
if (( environment_valid == 0 )); then
  shongre_warn "port checks skipped until the root environment is valid"
elif command -v lsof >/dev/null 2>&1; then
  for entry in "Frontend:$FRONTEND_PORT" "Playwright:$E2E_FRONTEND_PORT" "Backend:$BACKEND_PORT" "Metro:$EXPO_METRO_PORT"; do
    label="${entry%%:*}"
    port="${entry##*:}"
    port_pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true)"
    if [[ -z "$port_pids" ]]; then
      shongre_pass "$label port $port is available"
      continue
    fi
    port_is_safe=1
    while IFS= read -r port_pid; do
      [[ -n "$port_pid" ]] || continue
      if ! shongre_pid_belongs_to_project "$port_pid"; then
        shongre_fail "$label port $port is owned by unrelated PID $port_pid: $(shongre_pid_command "$port_pid")"
        port_is_safe=0
        failed=1
      fi
    done <<< "$port_pids"
    (( port_is_safe == 0 )) || shongre_pass "$label port $port is used by a Shongre process"
  done
else
  shongre_warn "port ownership checks were not run because lsof is unavailable"
fi

printf '\nInfrastructure\n'
if (( environment_valid == 0 )); then
  shongre_warn "infrastructure checks skipped until the root environment is valid"
elif [[ "$BACKEND_DATA_MODE" == "database" ]]; then
  for command_name in docker supabase; do
    shongre_require_command "$command_name" || failed=1
  done
  if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then shongre_pass "Docker daemon"; else shongre_fail "Docker daemon is unavailable"; failed=1; fi
  fi
else
  for command_name in docker supabase; do
    if command -v "$command_name" >/dev/null 2>&1; then shongre_pass "$command_name"; else shongre_warn "$command_name not installed (optional in demo mode)"; fi
  done
fi

printf '\nMobile\n'
for path_name in mobile/app mobile/src mobile/app.config.ts; do
  if [[ -e "$SHONGRE_ROOT/$path_name" ]]; then shongre_pass "$path_name"; else shongre_fail "$path_name missing"; failed=1; fi
done
if [[ -x "$SHONGRE_ROOT/node_modules/.bin/expo" ]]; then shongre_pass "Expo CLI (workspace)"; else shongre_fail "Expo workspace dependencies are not installed"; failed=1; fi
if [[ -x "$SHONGRE_ROOT/node_modules/.bin/eas" ]]; then shongre_pass "EAS CLI (workspace)"; else shongre_warn "EAS CLI not installed; release targets resolve it explicitly"; fi

printf '\niOS (optional for Web/Android)\n'
if [[ "$(uname -s)" == "Darwin" ]] && command -v xcodebuild >/dev/null 2>&1; then
  shongre_pass "$(xcodebuild -version | paste -sd ' ' -)"
else
  shongre_warn "Xcode unavailable"
fi
if command -v pod >/dev/null 2>&1; then shongre_pass "CocoaPods"; else shongre_warn "CocoaPods unavailable"; fi

printf '\nAndroid (optional for Web/iOS)\n'
if command -v java >/dev/null 2>&1; then shongre_pass "$(java -version 2>&1 | head -n 1)"; else shongre_warn "Java unavailable"; fi
if [[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then shongre_pass "Android SDK configured"; else shongre_warn "ANDROID_HOME/ANDROID_SDK_ROOT not configured"; fi
if command -v adb >/dev/null 2>&1; then shongre_pass "ADB"; else shongre_warn "ADB unavailable"; fi

if (( failed )); then
  printf '\n'
  shongre_fail "doctor found blocking issues"
  exit 1
fi
printf '\n'
shongre_pass "development machine is ready for the configured data modes"
