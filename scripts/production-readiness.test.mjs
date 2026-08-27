import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const environmentId = "shongre-production";
const valid = {
  APP_ENV: "production",
  NODE_ENV: "production",
  ENVIRONMENT_ID: environmentId,
  API_ENVIRONMENT_ID: environmentId,
  DATABASE_ENVIRONMENT_ID: environmentId,
  SUPABASE_ENVIRONMENT_ID: environmentId,
  STORAGE_ENVIRONMENT_ID: environmentId,
  NEXT_PUBLIC_ENVIRONMENT_ID: environmentId,
  EXPO_PUBLIC_ENVIRONMENT_ID: environmentId,
  NEXT_PUBLIC_APP_ENV: "production",
  EXPO_PUBLIC_APP_ENV: "production",
  PUBLIC_FR_URL: "https://fr.shongre.invalid",
  PUBLIC_INTL_URL: "https://intl.shongre.invalid",
  API_URL: "https://api.shongre.invalid",
  NEXT_PUBLIC_FR_URL: "https://fr.shongre.invalid",
  NEXT_PUBLIC_INTL_URL: "https://intl.shongre.invalid",
  EXPO_PUBLIC_FR_URL: "https://fr.shongre.invalid",
  EXPO_PUBLIC_INTL_URL: "https://intl.shongre.invalid",
  NEXT_PUBLIC_API_URL: "https://api.shongre.invalid/api/v1",
  EXPO_PUBLIC_API_URL: "https://api.shongre.invalid/api/v1",
  CORS_ORIGIN: "https://fr.shongre.invalid,https://intl.shongre.invalid",
  BACKEND_DATA_MODE: "database",
  DATABASE_INFRA_MODE: "hosted",
  NEXT_PUBLIC_DATA_MODE: "api",
  EXPO_PUBLIC_DATA_MODE: "api",
  NEXT_PUBLIC_ENABLE_MOCK_STORAGE: "false",
  NEXT_PUBLIC_ENABLE_AI_FEATURES: "false",
  PAYMENT_MODE: "live",
  EMAIL_MODE: "live",
  AI_MODE: "production",
  ANALYTICS_MODE: "production",
  PAYMENT_PROVIDER: "stripe",
  KYC_PROVIDER: "stripe",
  BUSINESS_REGISTRY_PROVIDER: "siret",
  AI_PROVIDER: "gemini",
  AUTH_COOKIE_SECURE: "true",
  SHONGRE_TRUST_PROXY_HOST: "true",
  SHONGRE_TRUST_PROXY_IP: "true",
  ENABLE_SOCIAL_AUTH: "false",
  ENABLE_ACCOUNT_LINKING: "false",
  ENABLE_GOOGLE_AUTH: "false",
  ENABLE_APPLE_AUTH: "false",
  ENABLE_FACEBOOK_AUTH: "false",
  DATABASE_URL: "postgresql://ci:ci@db.shongre.invalid:5432/shongre",
  SUPABASE_PROJECT_REF: "production-ref",
  EXPECTED_SUPABASE_PROJECT_REF: "production-ref",
  SUPABASE_URL: "https://production-ref.supabase.co",
  SUPABASE_ANON_KEY: "ci-anon-key-value",
  SUPABASE_SERVICE_ROLE_KEY: "ci-service-role-key-value-123456789",
  JWT_SECRET: "ci-jwt-signing-key-value-123456789",
  MFA_ENCRYPTION_KEY: "ci-mfa-encryption-key-value-123456789",
  PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString(
    "base64",
  ),
  PROVIDER_CREDENTIAL_KEY_VERSION: "production-v1",
  AUTH_EMAIL_DELIVERY_URL: "https://email.shongre.invalid/send",
  AUTH_EMAIL_DELIVERY_TOKEN: "ci-email-delivery-token-12345",
  STRIPE_SECRET_KEY: "sk_live_CIOnly123",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_CIOnly123",
  STRIPE_WEBHOOK_SECRET: "whsec_CI123",
  STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_CI456",
  COMPLIANCE_WEBHOOK_SECRET: "ci-compliance-webhook-secret-123456789",
  HANDOVER_PIN_PEPPER: "ci-handover-pin-pepper-value-123456789",
  KYC_PROVIDER_BASE_URL: "https://identity.shongre.invalid",
  KYC_PROVIDER_API_TOKEN: "ci-identity-provider-token",
  BUSINESS_REGISTRY_API_URL: "https://registry.shongre.invalid",
  BUSINESS_REGISTRY_API_TOKEN: "ci-business-registry-token",
  GEMINI_API_KEY: "ci-gemini-api-key",
  GEMINI_MODEL: "gemini-test",
  DEMO_ACCOUNT_PASSWORD: "",
};

function run(overrides, expectedStatus) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/production-readiness.mjs")],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ...valid, ...overrides },
    },
  );
  if (result.status !== expectedStatus) {
    throw new Error(
      result.stderr || result.stdout || `unexpected status ${result.status}`,
    );
  }
}

run({}, 0);
run({ ENABLE_SOCIAL_AUTH: "true" }, 1);
run({ STRIPE_SECRET_KEY: "sk_test_wrong_mode" }, 1);
console.log("Production configuration and launch-scope invariants passed.");
