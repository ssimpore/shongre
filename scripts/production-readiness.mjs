#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { loadEnvFiles } from "./lib/env-file.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const backendEnvFile = argumentValue("--backend-env-file");
const frontendEnvFile = argumentValue("--frontend-env-file");
if (Boolean(backendEnvFile) !== Boolean(frontendEnvFile)) {
  throw new Error(
    "--backend-env-file and --frontend-env-file must be supplied together",
  );
}
if (backendEnvFile && frontendEnvFile) {
  loadEnvFiles([
    { path: backendEnvFile, label: "backend env" },
    { path: frontendEnvFile, label: "frontend env" },
  ]);
}

const requireEvidence = process.argv.includes("--require-evidence");
const failures = [];
let checks = 0;

function fail(message) {
  failures.push(message);
}

function check(condition, message) {
  checks += 1;
  if (!condition) fail(message);
}

function value(name) {
  return (process.env[name] || "").trim();
}

function exact(name, expected) {
  check(value(name) === expected, `${name} must be ${expected}`);
}

function required(name, minimumLength = 1) {
  const candidate = value(name);
  check(
    candidate.length >= minimumLength &&
      !/(change[-_ ]?me|replace[-_ ]?me|example|placeholder|dummy)/i.test(
        candidate,
      ),
    `${name} must be supplied by the production secret/configuration store`,
  );
  return candidate;
}

function httpsUrl(name) {
  const candidate = required(name);
  try {
    const parsed = new URL(candidate);
    check(parsed.protocol === "https:", `${name} must use HTTPS`);
    check(
      !["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname),
      `${name} must not use a loopback host`,
    );
    return parsed;
  } catch {
    fail(`${name} must be an absolute HTTPS URL`);
    return undefined;
  }
}

function evidenceFile(name, maxAgeDays, requiredMarkers) {
  const candidate = value(name);
  check(Boolean(candidate), `${name} is required for release approval`);
  if (!candidate) return;
  const resolved = path.resolve(candidate);
  check(fs.existsSync(resolved), `${name} does not exist`);
  if (!fs.existsSync(resolved)) return;
  const ageDays =
    (Date.now() - fs.statSync(resolved).mtimeMs) / (24 * 60 * 60 * 1_000);
  check(
    ageDays <= maxAgeDays,
    `${name} is older than the allowed ${maxAgeDays} days`,
  );
  const content = fs.readFileSync(resolved, "utf8");
  for (const marker of requiredMarkers) {
    check(content.includes(marker), `${name} is missing ${marker}`);
  }
}

function jsonEvidenceFile(name, maxAgeDays, validate) {
  const candidate = value(name);
  check(Boolean(candidate), `${name} is required for release approval`);
  if (!candidate) return;
  const resolved = path.resolve(candidate);
  check(fs.existsSync(resolved), `${name} does not exist`);
  if (!fs.existsSync(resolved)) return;
  const ageDays =
    (Date.now() - fs.statSync(resolved).mtimeMs) / (24 * 60 * 60 * 1_000);
  check(
    ageDays <= maxAgeDays,
    `${name} is older than the allowed ${maxAgeDays} days`,
  );
  try {
    validate(JSON.parse(fs.readFileSync(resolved, "utf8")));
  } catch (error) {
    fail(
      `${name} is invalid: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

exact("APP_ENV", "production");
exact("NODE_ENV", "production");
exact("NEXT_PUBLIC_APP_ENV", "production");
exact("EXPO_PUBLIC_APP_ENV", "production");
exact("BACKEND_DATA_MODE", "database");
exact("DATABASE_INFRA_MODE", "hosted");
exact("NEXT_PUBLIC_DATA_MODE", "demo");
exact("EXPO_PUBLIC_DATA_MODE", "api");
exact("NEXT_PUBLIC_ENABLE_MOCK_STORAGE", "true");
exact("NEXT_PUBLIC_ENABLE_AI_FEATURES", "false");
exact("PAYMENT_MODE", "live");
exact("EMAIL_MODE", "live");
exact("AI_MODE", "production");
exact("ANALYTICS_MODE", "production");
exact("PAYMENT_PROVIDER", "stripe");
check(
  ["stripe", "live"].includes(value("KYC_PROVIDER")),
  "KYC_PROVIDER must be stripe or live",
);
exact("BUSINESS_REGISTRY_PROVIDER", "siret");
exact("AI_PROVIDER", "gemini");
exact("MALWARE_SCAN_MODE", "http");
exact("AUTH_COOKIE_SECURE", "true");
exact("SHONGRE_TRUST_PROXY_HOST", "true");
exact("SHONGRE_TRUST_PROXY_IP", "true");
exact("ENABLE_SOCIAL_AUTH", "false");
exact("ENABLE_ACCOUNT_LINKING", "false");
exact("ENABLE_GOOGLE_AUTH", "false");
exact("ENABLE_APPLE_AUTH", "false");
exact("ENABLE_FACEBOOK_AUTH", "false");

const environmentId = required("ENVIRONMENT_ID");
for (const name of [
  "API_ENVIRONMENT_ID",
  "DATABASE_ENVIRONMENT_ID",
  "SUPABASE_ENVIRONMENT_ID",
  "STORAGE_ENVIRONMENT_ID",
  "NEXT_PUBLIC_ENVIRONMENT_ID",
  "EXPO_PUBLIC_ENVIRONMENT_ID",
]) {
  exact(name, environmentId);
}

const franceUrl = httpsUrl("PUBLIC_FR_URL");
const internationalUrl = httpsUrl("PUBLIC_INTL_URL");
const apiUrl = httpsUrl("API_URL");
exact("NEXT_PUBLIC_FR_URL", value("PUBLIC_FR_URL"));
exact("NEXT_PUBLIC_INTL_URL", value("PUBLIC_INTL_URL"));
exact("EXPO_PUBLIC_FR_URL", value("PUBLIC_FR_URL"));
exact("EXPO_PUBLIC_INTL_URL", value("PUBLIC_INTL_URL"));
const publicApiUrl = httpsUrl("NEXT_PUBLIC_API_URL");
const mobileApiUrl = httpsUrl("EXPO_PUBLIC_API_URL");
httpsUrl("SUPABASE_URL");
httpsUrl("AUTH_EMAIL_DELIVERY_URL");
httpsUrl("BUSINESS_REGISTRY_API_URL");
httpsUrl("KYC_PROVIDER_BASE_URL");

if (franceUrl && internationalUrl) {
  check(
    franceUrl.origin !== internationalUrl.origin,
    "PUBLIC_FR_URL and PUBLIC_INTL_URL must use distinct production origins",
  );
}
for (const [name, clientUrl] of [
  ["NEXT_PUBLIC_API_URL", publicApiUrl],
  ["EXPO_PUBLIC_API_URL", mobileApiUrl],
]) {
  if (!clientUrl || !apiUrl) continue;
  check(clientUrl.origin === apiUrl.origin, `${name} must use API_URL origin`);
  check(
    clientUrl.pathname.replace(/\/$/, "") === "/api/v1",
    `${name} must include exactly the versioned /api/v1 prefix`,
  );
}

const corsOrigins = value("CORS_ORIGIN")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
check(corsOrigins.length > 0, "CORS_ORIGIN must contain an explicit origin");
for (const origin of corsOrigins) {
  check(origin !== "*", "CORS_ORIGIN must not contain a wildcard");
  try {
    check(
      new URL(origin).protocol === "https:",
      "Every CORS origin must use HTTPS",
    );
  } catch {
    fail("Every CORS origin must be an absolute URL");
  }
}
if (franceUrl && internationalUrl) {
  const expectedCorsOrigins = new Set([
    franceUrl.origin,
    internationalUrl.origin,
  ]);
  check(
    corsOrigins.length === expectedCorsOrigins.size &&
      corsOrigins.every((origin) => expectedCorsOrigins.has(origin)),
    "CORS_ORIGIN must contain exactly the configured France and international origins",
  );
}

const databaseUrl = required("DATABASE_URL");
try {
  check(
    ["postgres:", "postgresql:"].includes(new URL(databaseUrl).protocol),
    "DATABASE_URL must use postgres:// or postgresql://",
  );
} catch {
  fail("DATABASE_URL must be a valid PostgreSQL URL");
}

required("SUPABASE_ANON_KEY", 16);
required("SUPABASE_SERVICE_ROLE_KEY", 32);
const supabaseProjectRef = required("SUPABASE_PROJECT_REF");
exact("EXPECTED_SUPABASE_PROJECT_REF", supabaseProjectRef);
required("JWT_SECRET", 32);
required("MFA_ENCRYPTION_KEY", 32);
const providerCredentialKey = required(
  "PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64",
  40,
);
try {
  check(
    Buffer.from(providerCredentialKey, "base64").length === 32,
    "PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64 must decode to 32 bytes",
  );
} catch {
  fail("PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64 must be valid base64");
}
required("PROVIDER_CREDENTIAL_KEY_VERSION");
required("AUTH_EMAIL_DELIVERY_TOKEN", 24);
required("COMPLIANCE_WEBHOOK_SECRET", 32);
required("HANDOVER_PIN_PEPPER", 32);
required("GEMINI_API_KEY", 16);
required("GEMINI_MODEL");
required("BUSINESS_REGISTRY_API_TOKEN", 16);
required("KYC_PROVIDER_API_TOKEN", 16);
httpsUrl("MALWARE_SCAN_URL");
required("MALWARE_SCAN_TOKEN", 24);

check(
  /^sk_live_[A-Za-z0-9]+$/.test(value("STRIPE_SECRET_KEY")),
  "STRIPE_SECRET_KEY must be a live-mode secret key",
);
check(
  !value("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be empty while the web frontend is demo-only",
);
for (const name of ["STRIPE_WEBHOOK_SECRET", "STRIPE_CONNECT_WEBHOOK_SECRET"]) {
  check(/^whsec_[A-Za-z0-9]+$/.test(value(name)), `${name} must be configured`);
}

check(!value("DEMO_ACCOUNT_PASSWORD"), "DEMO_ACCOUNT_PASSWORD must be empty");
for (const [name, candidate] of Object.entries(process.env)) {
  if (
    /^(NEXT_PUBLIC|VITE|EXPO_PUBLIC)_/.test(name) &&
    /(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|DATABASE_URL)/.test(name) &&
    candidate
  ) {
    fail(`${name} exposes a secret-like value to a public bundle`);
  }
}

if (requireEvidence) {
  const releaseSha = required("RELEASE_SHA", 40);
  check(
    /^[0-9a-f]{40}$/.test(releaseSha),
    "RELEASE_SHA must be a full commit SHA",
  );
  evidenceFile("BACKUP_RESTORE_EVIDENCE_FILE", 30, [
    "database_restore=PASS",
    "storage_restore=PASS",
  ]);
  evidenceFile("PROVIDER_SMOKE_EVIDENCE_FILE", 14, [
    "environment=staging",
    `release_sha=${releaseSha}`,
    "stripe_payment=PASS",
    "stripe_refund=PASS",
    "stripe_payout=PASS",
    "stripe_identity=PASS",
    "business_registry=PASS",
    "gemini_moderation=PASS",
    "transactional_email=PASS",
  ]);
  evidenceFile("RELEASE_APPROVAL_EVIDENCE_FILE", 14, [
    `release_sha=${releaseSha}`,
    "security=APPROVED",
    "legal=APPROVED",
    "operations=APPROVED",
    "product=APPROVED",
  ]);
  evidenceFile("EDGE_FUNCTION_INVENTORY_EVIDENCE_FILE", 14, [
    "environment=production",
    "allowed=stripe-webhook",
    "unexpected=0",
  ]);
  jsonEvidenceFile("STAGING_CERTIFICATION_EVIDENCE_FILE", 14, (evidence) => {
    if (
      evidence.schemaVersion !== 1 ||
      evidence.environment !== "staging" ||
      evidence.result !== "passed" ||
      evidence.commit !== releaseSha ||
      evidence.checks?.hostedSmoke?.unexpected !== 0 ||
      evidence.checks?.performance?.result !== "PASS"
    ) {
      throw new Error(
        "certificate must bind successful hosted and performance checks to RELEASE_SHA",
      );
    }
  });
  jsonEvidenceFile("OBSERVABILITY_EVIDENCE_FILE", 14, (evidence) => {
    if (
      evidence.schemaVersion !== 1 ||
      evidence.result !== "PASS" ||
      evidence.release !== releaseSha ||
      evidence.scope !== "PLATFORM_GLOBAL" ||
      evidence.checks?.request_id_propagation !== "PASS" ||
      evidence.checks?.log_drain !== "PASS" ||
      evidence.checks?.trace_lookup !== "PASS" ||
      evidence.checks?.alert_delivery !== "PASS" ||
      evidence.checks?.on_call !== "PASS"
    ) {
      throw new Error(
        "observability evidence must prove request IDs, drains, traces, alerts, and on-call delivery",
      );
    }
  });
}

if (failures.length > 0) {
  console.error(`Production readiness failed (${failures.length} issue(s)):`);
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Production readiness passed ${checks} non-secret configuration${
      requireEvidence ? " and evidence" : ""
    } checks.`,
  );
}
