#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const frontendRoot = join(repositoryRoot, "frontend");
const sourceRoot = join(frontendRoot, "src");
const applicationRoot = join(frontendRoot, "app");
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["testing", "__tests__"].includes(entry.name)) return [];
      return walk(path);
    }
    if (!entry.isFile() || !/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path)) {
      return [];
    }
    if (/\.(?:test|spec)\.[^.]+$/.test(path)) return [];
    return [path];
  });
}

function reject(path, pattern, message) {
  if (pattern.test(readFileSync(path, "utf8"))) {
    failures.push(`${relative(repositoryRoot, path)}: ${message}`);
  }
}

const runtimeFiles = [
  ...walk(sourceRoot),
  ...walk(applicationRoot),
  join(frontendRoot, "proxy.ts"),
];
for (const path of runtimeFiles) {
  reject(
    path,
    /@supabase\/|supabase-js|\bcreateClient\s*\(|\bsupabase\s*\./i,
    "Web runtime must not access Supabase directly",
  );
  reject(
    path,
    /(?:from|require\s*\()\s*["'][^"']*backend\//,
    "Web runtime must not import backend implementation",
  );
  reject(
    path,
    /(?:from|require\s*\()\s*["'](?:[^"']*\/)?(?:demo|fixtures?|mocks?)(?:\/|["'])/i,
    "Web runtime must not import demo, fixture, or mock data",
  );
  reject(
    path,
    /\b(?:dataMode|mockData|fixtureData|demoData)\b|\b(?:Demo|Mock)[A-Z][A-Za-z0-9]*Service\b/,
    "runtime data-mode, mock, fixture, or demo service behavior is forbidden",
  );
  reject(
    path,
    /\bFAQ_ARTICLES\b|["']user-thomas["']|demo\.shongre\.test|["'](?:user|seller|buyer|account|owner)[_-](?:test|demo|thomas|marie|admin|buyer|seller|[0-9]+)["']/i,
    "embedded business records or placeholder identities are forbidden",
  );
  reject(
    path,
    /\bif\s*\([^)]*\.simulated\b|\?\s*[^:;]*\.simulated\b/,
    "components must not branch on simulated backend data",
  );
}

const adapterRoot = join(sourceRoot, "api/adapters/http");
for (const path of walk(adapterRoot)) {
  reject(
    path,
    /\b_(?:userId|accountId|ownerUserId|sellerId|buyerId|senderId|actor)\s*[:?]/,
    "HTTP contracts must derive acting identity from the authenticated backend principal",
  );
}

const registryPath = join(sourceRoot, "api/client/service-registry.ts");
const registrySource = readFileSync(registryPath, "utf8");
const loaderImports = [
  ...registrySource.matchAll(/import\(["']([^"']+)["']\)/g),
].map((match) => match[1]);
if (
  loaderImports.length === 0 ||
  loaderImports.some((value) => !value.startsWith("../adapters/http/http-"))
) {
  failures.push(
    `${relative(repositoryRoot, registryPath)}: every runtime service loader must resolve an HTTP adapter`,
  );
}

if (failures.length) {
  console.error(
    `Web API-only architecture check failed:\n${failures.join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `Web API-only architecture check passed (${runtimeFiles.length} runtime files audited, ${loaderImports.length} HTTP service loaders).`,
);
