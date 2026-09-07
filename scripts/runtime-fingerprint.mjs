import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fileURLToPath } from "node:url";

export function runtimeFingerprint(root, environment = process.env) {
  const hash = createHash("sha256");
  // Hash values without storing or printing credentials. Environment variables
  // introduced by npm/watchers are excluded so repeat invocations are stable.
  const keys = [
    ...readFileSync(resolve(root, ".env.example"), "utf8").matchAll(
      /^([A-Z][A-Z0-9_]*)=/gm,
    ),
  ]
    .map((match) => match[1])
    .filter((key) => key !== "WORKER_HEALTH_FILE")
    .sort();
  for (const key of keys)
    hash.update(JSON.stringify([key, environment[key] || ""]));
  const manifests = [
    "package.json",
    "frontend/package.json",
    "backend/package.json",
    "mobile/package.json",
    ...readdirSync(resolve(root, "packages"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `packages/${entry.name}/package.json`),
  ].sort();
  for (const manifest of manifests)
    hash.update(manifest).update(readFileSync(resolve(root, manifest)));
  hash.update(readFileSync(resolve(root, "package-lock.json")));
  for (const file of readdirSync(resolve(root, "backend/supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    hash
      .update(file)
      .update(readFileSync(resolve(root, "backend/supabase/migrations", file)));
  }
  return hash.digest("hex");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.stdout.write(
    runtimeFingerprint(resolve(import.meta.dirname, "..")) + "\n",
  );
}
