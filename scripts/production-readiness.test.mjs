import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
  SHONGRE_MARKETPLACE_ORIGIN: "https://marketplace.shongre.invalid",
  SHONGRE_SOLUTIONS_ORIGIN: "https://solutions.shongre.invalid",
  SHONGRE_PROSPECTS_ORIGIN: "https://prospects.shongre.invalid",
  SHONGRE_FACTURATION_ORIGIN: "https://facturation.shongre.invalid",
  EXPO_PUBLIC_FR_URL: "https://fr.shongre.invalid",
  EXPO_PUBLIC_INTL_URL: "https://intl.shongre.invalid",
  NEXT_PUBLIC_API_URL: "https://api.shongre.invalid/api/v1",
  EXPO_PUBLIC_API_URL: "https://api.shongre.invalid/api/v1",
  CORS_ORIGIN: "https://fr.shongre.invalid,https://intl.shongre.invalid",
  BACKEND_DATA_MODE: "database",
  DATABASE_INFRA_MODE: "hosted",
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
  REDIS_URL: "rediss://ci:secret@redis.shongre.invalid:6380",
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
  DIGITAL_FULFILLMENT_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 8).toString(
    "base64",
  ),
  DIGITAL_FULFILLMENT_KEY_VERSION: "production-v1",
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
  MALWARE_SCAN_MODE: "http",
  MALWARE_SCAN_URL: "https://scanner.shongre.invalid/v1/scan",
  MALWARE_SCAN_TOKEN: "ci-malware-scanner-token-12345",
  MALWARE_SCAN_TIMEOUT_MS: "15000",
  DEMO_ACCOUNT_PASSWORD: "",
};

function run(overrides, expectedStatus, args = []) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/production-readiness.mjs"), ...args],
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

/** The complete evidence set a release needs, freshly written so it is not stale. */
function releaseEvidence(directory, release) {
  const file = (name, content) => {
    const path = resolve(directory, name);
    writeFileSync(
      path,
      typeof content === "string" ? content : JSON.stringify(content),
    );
    return path;
  };
  return {
    RELEASE_SHA: release,
    BACKUP_RESTORE_EVIDENCE_FILE: file(
      "backup.txt",
      "database_restore=PASS\nstorage_restore=PASS\n",
    ),
    PROVIDER_SMOKE_EVIDENCE_FILE: file(
      "providers.txt",
      [
        "environment=staging",
        `release_sha=${release}`,
        ...[
          "stripe_payment",
          "stripe_refund",
          "stripe_payout",
          "stripe_identity",
          "business_registry",
          "gemini_moderation",
          "transactional_email",
          "sms_delivery",
          "push_delivery",
          "geocoding",
          "malware_scan",
          "search_index",
        ].map((name) => `${name}=PASS`),
      ].join("\n"),
    ),
    RELEASE_APPROVAL_EVIDENCE_FILE: file(
      "approval.txt",
      `release_sha=${release}\nsecurity=APPROVED\nlegal=APPROVED\noperations=APPROVED\nproduct=APPROVED\n`,
    ),
    EDGE_FUNCTION_INVENTORY_EVIDENCE_FILE: file(
      "edge.txt",
      "environment=production\nallowed=stripe-webhook\nunexpected=0\n",
    ),
    STAGING_CERTIFICATION_EVIDENCE_FILE: file("staging.json", {
      schemaVersion: 1,
      environment: "staging",
      result: "passed",
      commit: release,
      checks: {
        hostedSmoke: { unexpected: 0 },
        performance: { result: "PASS" },
      },
    }),
    OBSERVABILITY_EVIDENCE_FILE: file("observability.json", {
      schemaVersion: 1,
      result: "PASS",
      release,
      scope: "PLATFORM_GLOBAL",
      checks: {
        request_id_propagation: "PASS",
        log_drain: "PASS",
        trace_lookup: "PASS",
        alert_delivery: "PASS",
        on_call: "PASS",
      },
    }),
    IMAGE_TRANSFORM_EVIDENCE_FILE: file("image-transform.json", {
      schemaVersion: 1,
      environment: "production",
      transformMode: "supabase_render",
      sampleUrl: `${valid.SUPABASE_URL}/storage/v1/object/public/listing-media/sample.jpg`,
      result: "PASS",
      original: { width: 1280, bytes: 240_000 },
      transformed: { width: 320, bytes: 18_000 },
    }),
  };
}

run({}, 0);
run({ ENABLE_SOCIAL_AUTH: "true" }, 1);
run({ STRIPE_SECRET_KEY: "sk_test_wrong_mode" }, 1);
run({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_wrong_mode" }, 1);
run({ DIGITAL_FULFILLMENT_ENCRYPTION_KEY_BASE64: "not-a-32-byte-key" }, 1);
run({ SHONGRE_FACTURATION_ORIGIN: "https://solutions.shongre.invalid" }, 1);
run({ PUBLIC_MEDIA_IMAGE_TRANSFORM: "supabase_render" }, 0);
run({ PUBLIC_MEDIA_IMAGE_TRANSFORM: "imgproxy" }, 1);

const evidenceDirectory = mkdtempSync(resolve(tmpdir(), "shongre-release-"));
try {
  const release = "c".repeat(40);
  const evidence = releaseEvidence(evidenceDirectory, release);
  const requireEvidence = ["--require-evidence"];
  run(evidence, 0, requireEvidence);
  // Originals are served unchanged: no transformer evidence is needed.
  run({ ...evidence, IMAGE_TRANSFORM_EVIDENCE_FILE: "" }, 0, requireEvidence);
  run(
    { ...evidence, PUBLIC_MEDIA_IMAGE_TRANSFORM: "supabase_render" },
    0,
    requireEvidence,
  );
  // The transformer flag without proof, or with another project's proof, is
  // refused: every marketplace photo would break on a rejected transform.
  run(
    {
      ...evidence,
      PUBLIC_MEDIA_IMAGE_TRANSFORM: "supabase_render",
      IMAGE_TRANSFORM_EVIDENCE_FILE: "",
    },
    1,
    requireEvidence,
  );
  writeFileSync(
    evidence.IMAGE_TRANSFORM_EVIDENCE_FILE,
    JSON.stringify({
      schemaVersion: 1,
      environment: "staging",
      transformMode: "supabase_render",
      sampleUrl: `${valid.SUPABASE_URL}/storage/v1/object/public/listing-media/sample.jpg`,
      result: "PASS",
      original: { width: 1280, bytes: 240_000 },
      transformed: { width: 320, bytes: 18_000 },
    }),
  );
  run(
    { ...evidence, PUBLIC_MEDIA_IMAGE_TRANSFORM: "supabase_render" },
    1,
    requireEvidence,
  );
  run({ ...evidence, RELEASE_SHA: "d".repeat(40) }, 1, requireEvidence);
} finally {
  rmSync(evidenceDirectory, { recursive: true, force: true });
}
console.log("Production configuration and launch-scope invariants passed.");
