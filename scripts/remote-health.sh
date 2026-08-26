#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/utils.sh"

environment="${1:-}"
case "$environment" in development|staging|production) ;; *) shongre_fail "ENVIRONMENT must be development, staging, or production"; exit 2 ;; esac

export SHONGRE_ENV="$environment"
source "$root/scripts/env.sh"

for url in "$API_URL/livez" "$API_URL/readyz" "$PUBLIC_FR_URL/" "$PUBLIC_INTL_URL/"; do
  shongre_info "GET $url"
  curl --fail --silent --show-error --location --max-time 15 "$url" >/dev/null
done

shongre_pass "$environment web and API health checks passed"
