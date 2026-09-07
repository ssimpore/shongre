#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const mobileRoot = join(root, "mobile");
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (
      entry.isDirectory() &&
      !["node_modules", "ios", "android", ".expo"].includes(entry.name)
    ) {
      return walk(path);
    }
    return entry.isFile() ? [path] : [];
  });
}

function source(path) {
  return readFileSync(path, "utf8");
}

function reject(path, pattern, message) {
  if (pattern.test(source(path))) {
    failures.push(`${relative(root, path)}: ${message}`);
  }
}

const runtimeFiles = [join(mobileRoot, "app"), join(mobileRoot, "src")]
  .flatMap(walk)
  .filter((path) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path));

for (const path of runtimeFiles) {
  reject(path, /\bdataMode\b/, "mobile data-mode selection is forbidden");
  reject(
    path,
    /\bd[eé]mo(?:nstration)?\b|Demo[A-Z]|\.demo(?:\.|-)|\b(?:fixture|sample)s?\b/i,
    "runtime demo behavior or fixtures are forbidden",
  );
  reject(
    path,
    /@supabase\/|supabase-js|\bcreateClient\s*\(|\bsupabase\s*\./i,
    "mobile must not access Supabase directly",
  );
  reject(
    path,
    /(?:from|require\s*\()\s*["'][^"']*backend\//,
    "mobile must not import backend implementation",
  );
  if (
    /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|from\s+["'](?:ky|got)["']/.test(
      source(path),
    ) &&
    ![
      join(mobileRoot, "src/api/http-client.ts"),
      join(mobileRoot, "src/api/signed-upload.ts"),
    ].includes(path)
  ) {
    failures.push(
      `${relative(root, path)}: direct fetch is outside an approved transport boundary`,
    );
  }
  if (
    /\bapiRequest\b/.test(source(path)) &&
    (path.startsWith(join(mobileRoot, "app")) ||
      path.startsWith(join(mobileRoot, "src/components")))
  ) {
    failures.push(
      `${relative(root, path)}: routes and components must use service contracts, not the HTTP client`,
    );
  }
  if (
    /\/api\/v1/.test(source(path)) &&
    path !== join(mobileRoot, "src/config/environment.ts")
  ) {
    failures.push(
      `${relative(root, path)}: call sites must not prepend the configured /api/v1 base path`,
    );
  }
  if (/openapi\.(?:json|ya?ml)$/i.test(basename(path))) {
    failures.push(
      `${relative(root, path)}: a second API specification is forbidden`,
    );
  }
}

const selectorFiles = [
  ...walk(mobileRoot),
  ...readdirSync(root)
    .filter((name) => name === "Makefile" || /^\.env(?:\.|$)/.test(name))
    .map((name) => join(root, name))
    .filter((path) => statSync(path).isFile()),
  join(root, "scripts/env.sh"),
  join(root, "scripts/env-check.sh"),
  join(root, "scripts/environment-matrix-check.sh"),
  join(root, "scripts/status.sh"),
  join(root, "scripts/production-readiness.mjs"),
  join(root, "scripts/production-readiness.test.mjs"),
  join(root, "scripts/local-development-contract.test.mjs"),
  join(root, ".github/workflows/ci.yml"),
].filter(
  (path) =>
    !path.includes("node_modules") &&
    path !== join(mobileRoot, "scripts/api-only-check.mjs"),
);

for (const path of new Set(selectorFiles)) {
  reject(
    path,
    /EXPO_PUBLIC_DATA_MODE/,
    "the removed mobile data-mode variable must not return",
  );
}

const environmentSource = source(join(mobileRoot, "src/config/environment.ts"));
if (!/required\(\s*["']EXPO_PUBLIC_API_URL["']/.test(environmentSource)) {
  failures.push(
    "mobile/src/config/environment.ts: EXPO_PUBLIC_API_URL must remain mandatory",
  );
}
const httpClientSource = source(join(mobileRoot, "src/api/http-client.ts"));
if (!/type ApiRequestPath = ApiPath \|/.test(httpClientSource)) {
  failures.push(
    "mobile/src/api/http-client.ts: request paths must remain tied to generated ApiPath",
  );
}

if (failures.length) {
  console.error(
    `Mobile API-only architecture check failed:\n${failures.join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `Mobile API-only architecture check passed (${runtimeFiles.length} runtime files audited).`,
);
