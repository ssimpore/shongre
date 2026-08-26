#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/utils.sh"

operation="${1:-}"
environment="${2:-}"
case "$operation" in deploy|rollback) ;; *) shongre_fail "operation must be deploy or rollback"; exit 2 ;; esac
case "$environment" in development|staging|production) ;; *) shongre_fail "ENVIRONMENT must be development, staging, or production"; exit 2 ;; esac

command -v gh >/dev/null 2>&1 || {
  shongre_fail "GitHub CLI is required to dispatch the protected deployment workflow"
  exit 1
}
gh auth status >/dev/null 2>&1 || {
  shongre_fail "GitHub CLI is not authenticated; run gh auth login"
  exit 1
}

cd "$root"
release_ref="$(git rev-parse HEAD)"
if [[ "$operation" == "rollback" ]]; then
  release_ref="${RELEASE_SHA:-}"
  [[ "$release_ref" =~ ^[0-9a-f]{40}$ ]] || {
    shongre_fail "rollback requires RELEASE_SHA=<known-good-full-sha>"
    exit 2
  }
fi
if [[ "$environment" == "production" ]]; then
  git fetch --quiet origin main
  if ! git merge-base --is-ancestor "$release_ref" origin/main; then
    shongre_fail "production only accepts a commit already present on origin/main"
    exit 1
  fi
fi

if [[ "$operation" == "rollback" ]]; then
  gh workflow run rollback.yml --ref main \
    -f "environment=$environment" \
    -f "release_sha=$release_ref"
else
  case "$environment" in
    development) workflow="build-deploy-dev.yml" ;;
    staging) workflow="promote-staging.yml" ;;
    production) workflow="deploy-production.yml" ;;
  esac
  gh workflow run "$workflow" --ref main -f "release_sha=$release_ref"
fi

shongre_pass "$operation dispatched for $environment at $release_ref without an environment rebuild"
shongre_info "follow it with: gh run watch --exit-status"
