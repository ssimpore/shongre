import { assertPrivateFile, parseEnvFile } from "./lib/env-file.mjs";

const [
  expectedEnvironment,
  expectedEnvironmentId,
  frontendPath,
  backendPath,
  tunnelTokenPath,
] = process.argv.slice(2);
if (
  !expectedEnvironment ||
  !expectedEnvironmentId ||
  !frontendPath ||
  !backendPath ||
  !tunnelTokenPath
) {
  throw new Error(
    "usage: validate-deployment-env ENVIRONMENT ENVIRONMENT_ID FRONTEND_ENV BACKEND_ENV TUNNEL_TOKEN",
  );
}

function requireValue(entries, key, expected, label) {
  const value = entries.get(key);
  if (!value) throw new Error(`[Deploy Config] ${label} requires ${key}.`);
  if (expected !== undefined && value !== expected) {
    throw new Error(
      `[Deploy Config] ${label} ${key} targets the wrong environment.`,
    );
  }
}

const frontend = parseEnvFile(frontendPath, "frontend env");
const backend = parseEnvFile(backendPath, "backend env");
assertPrivateFile(tunnelTokenPath, "Tunnel token");

for (const [entries, label] of [
  [frontend, "frontend env"],
  [backend, "backend env"],
]) {
  requireValue(entries, "APP_ENV", expectedEnvironment, label);
  requireValue(entries, "ENVIRONMENT_ID", expectedEnvironmentId, label);
}
for (const key of [
  "API_ENVIRONMENT_ID",
  "DATABASE_ENVIRONMENT_ID",
  "SUPABASE_ENVIRONMENT_ID",
  "STORAGE_ENVIRONMENT_ID",
]) {
  requireValue(backend, key, expectedEnvironmentId, "backend env");
}
for (const key of [
  "PUBLIC_FR_URL",
  "PUBLIC_INTL_URL",
  "API_URL",
  "NEXT_PUBLIC_DATA_MODE",
  "NEXT_PUBLIC_ENABLE_MOCK_STORAGE",
]) {
  requireValue(frontend, key, undefined, "frontend env");
}
requireValue(
  frontend,
  "NEXT_PUBLIC_ENABLE_AI_FEATURES",
  "false",
  "frontend env",
);

const modes = {
  staging: {
    payment: "test",
    email: "sandbox",
    ai: "staging",
    analytics: "staging",
    stripeSecretPrefix: "sk_test_",
    stripePublicPrefix: "pk_test_",
  },
  production: {
    payment: "live",
    email: "live",
    ai: "production",
    analytics: "production",
    stripeSecretPrefix: "sk_live_",
    stripePublicPrefix: "pk_live_",
  },
};
const expectedModes = modes[expectedEnvironment];
if (expectedModes) {
  requireValue(frontend, "NEXT_PUBLIC_DATA_MODE", "api", "frontend env");
  requireValue(
    frontend,
    "NEXT_PUBLIC_ENABLE_MOCK_STORAGE",
    "false",
    "frontend env",
  );
  const applicationOrigins = [
    "SHONGRE_MARKETPLACE_ORIGIN",
    "SHONGRE_SOLUTIONS_ORIGIN",
    "SHONGRE_PROSPECTS_ORIGIN",
    "SHONGRE_FACTURATION_ORIGIN",
  ].map((key) => {
    requireValue(frontend, key, undefined, "frontend env");
    const candidate = new URL(frontend.get(key));
    if (
      candidate.protocol !== "https:" ||
      candidate.username ||
      candidate.password ||
      candidate.pathname !== "/" ||
      candidate.search ||
      candidate.hash
    ) {
      throw new Error(
        `[Deploy Config] frontend env ${key} must be an HTTPS origin.`,
      );
    }
    return candidate;
  });
  if (
    new Set(applicationOrigins.map((candidate) => candidate.host)).size !==
    applicationOrigins.length
  ) {
    throw new Error(
      "[Deploy Config] frontend application origins must use distinct hosts.",
    );
  }
  for (const [key, expected] of [
    ["NODE_ENV", "production"],
    ["BACKEND_DATA_MODE", "database"],
    ["DATABASE_INFRA_MODE", "hosted"],
    ["PAYMENT_MODE", expectedModes.payment],
    ["EMAIL_MODE", expectedModes.email],
    ["AI_MODE", expectedModes.ai],
    ["ANALYTICS_MODE", expectedModes.analytics],
    ["PAYMENT_PROVIDER", "stripe"],
    ["KYC_PROVIDER", "stripe"],
    ["BUSINESS_REGISTRY_PROVIDER", "siret"],
    ["AI_PROVIDER", "gemini"],
    ["MALWARE_SCAN_MODE", "http"],
    ["AUTH_COOKIE_SECURE", "true"],
    ["SHONGRE_TRUST_PROXY_HOST", "true"],
    ["SHONGRE_TRUST_PROXY_IP", "true"],
    ["ENABLE_SOCIAL_AUTH", "false"],
    ["ENABLE_GOOGLE_AUTH", "false"],
    ["ENABLE_APPLE_AUTH", "false"],
    ["ENABLE_FACEBOOK_AUTH", "false"],
  ]) {
    requireValue(backend, key, expected, "backend env");
  }
  for (const key of [
    "DATABASE_URL",
    "SUPABASE_PROJECT_REF",
    "EXPECTED_SUPABASE_PROJECT_REF",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET",
    "MFA_ENCRYPTION_KEY",
    "PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64",
    "PROVIDER_CREDENTIAL_KEY_VERSION",
    "AUTH_EMAIL_DELIVERY_URL",
    "AUTH_EMAIL_DELIVERY_TOKEN",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_CONNECT_WEBHOOK_SECRET",
    "COMPLIANCE_WEBHOOK_SECRET",
    "HANDOVER_PIN_PEPPER",
    "KYC_PROVIDER_BASE_URL",
    "KYC_PROVIDER_API_TOKEN",
    "BUSINESS_REGISTRY_API_URL",
    "BUSINESS_REGISTRY_API_TOKEN",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "MALWARE_SCAN_URL",
    "MALWARE_SCAN_TOKEN",
  ]) {
    requireValue(backend, key, undefined, "backend env");
  }
  requireValue(
    frontend,
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    undefined,
    "frontend env",
  );
  if (
    !backend
      .get("STRIPE_SECRET_KEY")
      ?.startsWith(expectedModes.stripeSecretPrefix)
  ) {
    throw new Error(
      `[Deploy Config] backend env Stripe key has the wrong mode for ${expectedEnvironment}.`,
    );
  }
  if (
    !frontend
      .get("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
      ?.startsWith(expectedModes.stripePublicPrefix)
  ) {
    throw new Error(
      `[Deploy Config] frontend env Stripe key has the wrong mode for ${expectedEnvironment}.`,
    );
  }
  if (
    backend.get("SUPABASE_PROJECT_REF") !==
    backend.get("EXPECTED_SUPABASE_PROJECT_REF")
  ) {
    throw new Error(
      "[Deploy Config] backend env Supabase project reference is not the expected target.",
    );
  }
  if (
    expectedEnvironment === "staging" &&
    !backend.get("EMAIL_RECIPIENT_ALLOWLIST")
  ) {
    throw new Error(
      "[Deploy Config] staging backend env requires EMAIL_RECIPIENT_ALLOWLIST.",
    );
  }
}

const forbiddenFrontendKey =
  /(^DATABASE_URL$|^SUPABASE_|SERVICE_ROLE|(^|_)(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ENCRYPTION_KEY|PEPPER)(_|$)|^STRIPE_SECRET_KEY$|^GEMINI_API_KEY$)/;
for (const key of frontend.keys()) {
  if (forbiddenFrontendKey.test(key)) {
    throw new Error(
      `[Deploy Config] frontend env contains forbidden server variable ${key}.`,
    );
  }
}

console.log(
  `[Deploy Config] validated isolated ${expectedEnvironment} frontend/backend files and private Tunnel token permissions.`,
);
