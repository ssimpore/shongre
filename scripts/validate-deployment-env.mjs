import { readFileSync, statSync } from "node:fs";

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

function assertPrivateFile(path, label) {
  const stat = statSync(path);
  if (!stat.isFile())
    throw new Error(`[Deploy Config] ${label} must be a regular file.`);
  if ((stat.mode & 0o007) !== 0) {
    throw new Error(
      `[Deploy Config] ${label} must not be accessible to other users.`,
    );
  }
}

function parse(path, label) {
  assertPrivateFile(path, label);
  const entries = new Map();
  for (const sourceLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7) : line;
    const separator = normalized.indexOf("=");
    if (separator <= 0)
      throw new Error(`[Deploy Config] ${label} has a malformed line.`);
    const key = normalized.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`[Deploy Config] ${label} has an invalid variable name.`);
    }
    if (entries.has(key))
      throw new Error(`[Deploy Config] ${label} repeats ${key}.`);
    let value = normalized.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries.set(key, value);
  }
  return entries;
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

const frontend = parse(frontendPath, "frontend env");
const backend = parse(backendPath, "backend env");
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
