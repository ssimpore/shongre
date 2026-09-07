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

  if [[ "$profile" == "development" || "$profile" == "staging" || "$profile" == "production" ]]; then
    export JWT_SECRET=matrix-validation-jwt-secret-123456789
    export MFA_ENCRYPTION_KEY=matrix-validation-mfa-secret-123456789
    export PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64=YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=
    export PROVIDER_CREDENTIAL_KEY_VERSION=matrix-v1
    export DIGITAL_FULFILLMENT_ENCRYPTION_KEY_BASE64=YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmI=
    export DIGITAL_FULFILLMENT_KEY_VERSION=matrix-v1
    export HANDOVER_PIN_PEPPER=matrix-handover-pin-pepper-value-123456
  fi

  if [[ "$profile" == "staging" || "$profile" == "production" ]]; then
    export NEXT_PUBLIC_DATA_MODE=api
    export NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false
    export SHONGRE_MARKETPLACE_ORIGIN="https://marketplace-${profile}.shongre.invalid"
    export SHONGRE_SOLUTIONS_ORIGIN="https://solutions-${profile}.shongre.invalid"
    export SHONGRE_PROSPECTS_ORIGIN="https://prospects-${profile}.shongre.invalid"
    export SHONGRE_FACTURATION_ORIGIN="https://facturation-${profile}.shongre.invalid"
    export AUTH_EMAIL_DELIVERY_URL=https://email.shongre.invalid/send
    export AUTH_EMAIL_DELIVERY_TOKEN=matrix-email-token
    export PAYMENT_PROVIDER=stripe
    export KYC_PROVIDER=stripe
    export BUSINESS_REGISTRY_PROVIDER=siret
    export AI_PROVIDER=gemini
    export STRIPE_WEBHOOK_SECRET=whsec_matrix
    export STRIPE_CONNECT_WEBHOOK_SECRET=whsec_connect_matrix
    export COMPLIANCE_WEBHOOK_SECRET=matrix-compliance
    export KYC_PROVIDER_BASE_URL=https://identity.shongre.invalid
    export KYC_PROVIDER_API_TOKEN=matrix-identity
    export BUSINESS_REGISTRY_API_URL=https://registry.shongre.invalid
    export BUSINESS_REGISTRY_API_TOKEN=matrix-registry
    export GEMINI_API_KEY=matrix-gemini
    export GEMINI_MODEL=gemini-matrix
    export MALWARE_SCAN_MODE=http
    export MALWARE_SCAN_URL=https://scanner.shongre.invalid/scan
    export MALWARE_SCAN_TOKEN=matrix-malware-scanner-token
    export ENABLE_SOCIAL_AUTH=false
    export ENABLE_ACCOUNT_LINKING=false
    export ENABLE_GOOGLE_AUTH=false
    export ENABLE_APPLE_AUTH=false
    export ENABLE_FACEBOOK_AUTH=false
    export NEXT_PUBLIC_ENABLE_AI_FEATURES=false
    if [[ "$profile" == "staging" ]]; then
      export STRIPE_SECRET_KEY=sk_test_matrix
      export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_matrix
      export EMAIL_RECIPIENT_ALLOWLIST=matrix-recipient@shongre.invalid
    else
      export STRIPE_SECRET_KEY=sk_live_matrix
      export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_matrix
    fi
  fi

  "$root/scripts/env-check.sh"
)

for profile in local test preview development staging production; do
  printf 'Validating %s profile...\n' "$profile"
  validate_profile "$profile"
done

if SHONGRE_EXPLICIT_DEMO=true NEXT_PUBLIC_DATA_MODE=demo NEXT_PUBLIC_ENABLE_MOCK_STORAGE=true BACKEND_DATA_MODE=demo validate_profile local >/dev/null 2>&1; then
  :
else
  printf 'Local unexpectedly rejected the complete explicit deterministic demo contract.\n' >&2
  exit 1
fi

if BACKEND_DATA_MODE=demo validate_profile local >/dev/null 2>&1; then
  printf 'Local unexpectedly accepted backend demo mode without an explicit demo command.\n' >&2
  exit 1
fi

if NEXT_PUBLIC_DATA_MODE=demo validate_profile development >/dev/null 2>&1; then
  printf 'Development unexpectedly accepted demo Web data mode.\n' >&2
  exit 1
fi
if DATABASE_INFRA_MODE=local validate_profile staging >/dev/null 2>&1; then
  printf 'Staging unexpectedly accepted local database infrastructure.\n' >&2
  exit 1
fi
if BACKEND_DATA_MODE=demo validate_profile production >/dev/null 2>&1; then
  printf 'Production unexpectedly accepted demo backend data mode.\n' >&2
  exit 1
fi

printf 'All six environment profiles passed isolated configuration and fail-closed mode validation.\n'
