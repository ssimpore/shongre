#!/usr/bin/env bash

set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

failed=0
printf 'Core\n'
for command_name in git make node npm; do
  shongre_require_command "$command_name" || failed=1
done

if [[ -f "$SHONGRE_ROOT/package-lock.json" ]]; then
  shongre_pass "package manager: npm (package-lock.json)"
else
  shongre_warn "package-lock.json is missing; run make install"
fi

printf '\nInfrastructure (optional in demo mode)\n'
for command_name in docker supabase; do
  if command -v "$command_name" >/dev/null 2>&1; then shongre_pass "$command_name"; else shongre_warn "$command_name not installed"; fi
done

printf '\nMobile\n'
for path_name in mobile/app mobile/src mobile/app.config.ts; do
  if [[ -e "$SHONGRE_ROOT/$path_name" ]]; then shongre_pass "$path_name"; else shongre_fail "$path_name missing"; failed=1; fi
done
if [[ -x "$SHONGRE_ROOT/node_modules/.bin/expo" ]]; then shongre_pass "Expo CLI (workspace)"; else shongre_warn "Expo dependencies are not installed"; fi
if [[ -x "$SHONGRE_ROOT/node_modules/.bin/eas" ]]; then shongre_pass "EAS CLI (workspace)"; else shongre_warn "EAS CLI not installed; use npx eas-cli for release work"; fi

printf '\niOS\n'
if [[ "$(uname -s)" == "Darwin" ]] && command -v xcodebuild >/dev/null 2>&1; then
  shongre_pass "$(xcodebuild -version | paste -sd ' ' -)"
else
  shongre_warn "Xcode unavailable (optional except for local iOS builds)"
fi
if command -v pod >/dev/null 2>&1; then shongre_pass "CocoaPods"; else shongre_warn "CocoaPods unavailable (optional until native iOS build)"; fi

printf '\nAndroid\n'
if command -v java >/dev/null 2>&1; then shongre_pass "$(java -version 2>&1 | head -n 1)"; else shongre_warn "Java unavailable"; fi
if [[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then shongre_pass "Android SDK configured"; else shongre_warn "ANDROID_HOME/ANDROID_SDK_ROOT not configured"; fi
if command -v adb >/dev/null 2>&1; then shongre_pass "ADB"; else shongre_warn "ADB unavailable"; fi

exit "$failed"

