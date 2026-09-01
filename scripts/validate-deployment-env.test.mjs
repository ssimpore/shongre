import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const directory = mkdtempSync(resolve(tmpdir(), "shongre-deploy-env-"));
const frontendPath = resolve(directory, "frontend.env");
const backendPath = resolve(directory, "backend.env");
const tokenPath = resolve(directory, "tunnel-token");
const environment = "staging";
const environmentId = "shongre-staging";

const frontend = `APP_ENV=${environment}
ENVIRONMENT_ID=${environmentId}
PUBLIC_FR_URL=https://staging.shongre.example
PUBLIC_INTL_URL=https://staging-intl.shongre.example
API_URL=https://api-staging.shongre.example
SHONGRE_MARKETPLACE_ORIGIN=https://marketplace-staging.shongre.example
SHONGRE_SOLUTIONS_ORIGIN=https://solutions-staging.shongre.example
SHONGRE_PROSPECTS_ORIGIN=https://prospects-staging.shongre.example
SHONGRE_FACTURATION_ORIGIN=https://facturation-staging.shongre.example
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false
NEXT_PUBLIC_ENABLE_AI_FEATURES=false
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ci
`;
const backend = `APP_ENV=${environment}
ENVIRONMENT_ID=${environmentId}
API_ENVIRONMENT_ID=${environmentId}
DATABASE_ENVIRONMENT_ID=${environmentId}
SUPABASE_ENVIRONMENT_ID=${environmentId}
STORAGE_ENVIRONMENT_ID=${environmentId}
NODE_ENV=production
BACKEND_DATA_MODE=database
DATABASE_INFRA_MODE=hosted
PAYMENT_MODE=test
EMAIL_MODE=sandbox
AI_MODE=staging
ANALYTICS_MODE=staging
PAYMENT_PROVIDER=stripe
KYC_PROVIDER=stripe
BUSINESS_REGISTRY_PROVIDER=siret
AI_PROVIDER=gemini
AUTH_COOKIE_SECURE=true
SHONGRE_TRUST_PROXY_HOST=true
SHONGRE_TRUST_PROXY_IP=true
ENABLE_SOCIAL_AUTH=false
ENABLE_GOOGLE_AUTH=false
ENABLE_APPLE_AUTH=false
ENABLE_FACEBOOK_AUTH=false
DATABASE_URL=postgresql://ci:ci@db.example/shongre
SUPABASE_PROJECT_REF=staging-ref
EXPECTED_SUPABASE_PROJECT_REF=staging-ref
SUPABASE_URL=https://staging-ref.supabase.co
SUPABASE_ANON_KEY=ci-anon
SUPABASE_SERVICE_ROLE_KEY=ci-service-role
JWT_SECRET=ci-jwt-secret
MFA_ENCRYPTION_KEY=ci-mfa-key
PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64=Y2ktcHJvdmlkZXIta2V5
PROVIDER_CREDENTIAL_KEY_VERSION=staging-v1
AUTH_EMAIL_DELIVERY_URL=https://email.example/send
AUTH_EMAIL_DELIVERY_TOKEN=ci-email-token
EMAIL_RECIPIENT_ALLOWLIST=release-tester@example.com
STRIPE_SECRET_KEY=sk_test_ci
STRIPE_WEBHOOK_SECRET=whsec_ci
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_connect_ci
COMPLIANCE_WEBHOOK_SECRET=ci-compliance
HANDOVER_PIN_PEPPER=ci-handover
KYC_PROVIDER_BASE_URL=https://identity.example
KYC_PROVIDER_API_TOKEN=ci-identity
BUSINESS_REGISTRY_API_URL=https://registry.example
BUSINESS_REGISTRY_API_TOKEN=ci-registry
GEMINI_API_KEY=ci-gemini
GEMINI_MODEL=gemini-test
MALWARE_SCAN_MODE=http
MALWARE_SCAN_URL=https://scanner.example/scan
MALWARE_SCAN_TOKEN=ci-malware-scanner-token
`;

function writePrivate(path, value) {
  writeFileSync(path, value, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function run(expectedStatus) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/validate-deployment-env.mjs"),
      environment,
      environmentId,
      frontendPath,
      backendPath,
      tokenPath,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== expectedStatus) {
    throw new Error(
      result.stderr || result.stdout || `unexpected status ${result.status}`,
    );
  }
}

try {
  writePrivate(frontendPath, frontend);
  writePrivate(backendPath, backend);
  writePrivate(tokenPath, "test-token\n");
  run(0);

  writePrivate(
    frontendPath,
    `${frontend}DATABASE_URL=postgresql://forbidden\n`,
  );
  run(1);

  writePrivate(frontendPath, frontend);
  writePrivate(
    frontendPath,
    frontend.replace("NEXT_PUBLIC_DATA_MODE=api", "NEXT_PUBLIC_DATA_MODE=demo"),
  );
  run(1);

  writePrivate(
    frontendPath,
    frontend.replace(
      "SHONGRE_FACTURATION_ORIGIN=https://facturation-staging.shongre.example",
      "SHONGRE_FACTURATION_ORIGIN=https://solutions-staging.shongre.example",
    ),
  );
  run(1);

  writePrivate(frontendPath, frontend);
  writePrivate(
    backendPath,
    backend.replace(
      `DATABASE_ENVIRONMENT_ID=${environmentId}`,
      "DATABASE_ENVIRONMENT_ID=shongre-production",
    ),
  );
  run(1);

  writePrivate(backendPath, backend);
  chmodSync(tokenPath, 0o644);
  run(1);

  console.log(
    "Deployment environment isolation and permission invariants passed.",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
