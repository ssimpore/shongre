#!/bin/sh
set -eu

artifact_directory="${1:?artifact directory is required}"
project_secret_file="${2:?project secret file is required}"
release="${VCS_REF:-}"

read_secret() {
  secret_file="$1"
  if [ -r "$secret_file" ]; then
    tr -d '\r\n' < "$secret_file"
  fi
}

auth_token="$(read_secret /run/secrets/sentry_auth_token)"
organization="$(read_secret /run/secrets/sentry_org)"
project="$(read_secret "$project_secret_file")"
sentry_url="$(read_secret /run/secrets/sentry_url)"

if [ -z "$auth_token$organization$project" ]; then
  echo "Sentry source-map upload skipped: build credentials are not configured."
  exit 0
fi

if [ -z "$auth_token" ] || [ -z "$organization" ] || [ -z "$project" ]; then
  echo "Sentry source-map upload failed: token, organization, and project must be configured together." >&2
  exit 1
fi

if [ -z "$release" ]; then
  echo "Sentry source-map upload failed: VCS_REF is required." >&2
  exit 1
fi

export SENTRY_AUTH_TOKEN="$auth_token"
export SENTRY_ORG="$organization"
export SENTRY_PROJECT="$project"
if [ -n "$sentry_url" ]; then
  export SENTRY_URL="$sentry_url"
fi

npx --no-install sentry-cli sourcemaps inject --quiet "$artifact_directory"
npx --no-install sentry-cli sourcemaps upload \
  --quiet \
  --strict \
  --validate \
  --wait \
  --release "$release" \
  "$artifact_directory"

unset SENTRY_AUTH_TOKEN
echo "Sentry source maps uploaded for release $release."
