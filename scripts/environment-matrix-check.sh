#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

validate_profile() (
  profile="$1"
  unset SHONGRE_ENV_LOADED APP_ENV
  export SHONGRE_ENV="$profile"

  if [[ "$profile" == "preview" ]]; then
    export ENVIRONMENT_ID=shongre-preview-validation
    export API_ENVIRONMENT_ID="$ENVIRONMENT_ID"
    export DATABASE_ENVIRONMENT_ID="$ENVIRONMENT_ID"
    export SUPABASE_ENVIRONMENT_ID="$ENVIRONMENT_ID"
    export STORAGE_ENVIRONMENT_ID="$ENVIRONMENT_ID"
    export PUBLIC_FR_URL=https://preview-validation.shongre.invalid
    export PUBLIC_INTL_URL=https://preview-validation-intl.shongre.invalid
    export API_URL=https://api-preview-validation.shongre.invalid
  fi

  if [[ "$profile" == "preview" || "$profile" == "development" || "$profile" == "staging" || "$profile" == "production" ]]; then
    export DATABASE_URL="postgresql://matrix:matrix@db-${profile}.shongre.invalid:5432/shongre"
    export SUPABASE_PROJECT_REF="matrix-${profile}"
    export EXPECTED_SUPABASE_PROJECT_REF="$SUPABASE_PROJECT_REF"
    export SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
    export SUPABASE_ANON_KEY=matrix-validation-public-anon-value
    export SUPABASE_SERVICE_ROLE_KEY=matrix-validation-server-value
  fi

  "$root/scripts/env-check.sh"
)

for profile in local test preview development staging production; do
  printf 'Validating %s profile...\n' "$profile"
  validate_profile "$profile"
done

printf 'All six environment profiles passed isolated configuration validation.\n'
