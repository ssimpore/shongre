#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRef = (process.env.SUPABASE_PROJECT_REF || "").trim();
const expectedProjectRef = (
  process.env.EXPECTED_SUPABASE_PROJECT_REF || ""
).trim();
const environment = (process.env.APP_ENV || "").trim();
const evidencePath = (
  process.env.EDGE_FUNCTION_INVENTORY_EVIDENCE_FILE || ""
).trim();
const allowed = new Set(["stripe-webhook"]);

if (!projectRef || projectRef !== expectedProjectRef) {
  throw new Error(
    "SUPABASE_PROJECT_REF must match EXPECTED_SUPABASE_PROJECT_REF before inspecting remote functions.",
  );
}
if (!environment || !evidencePath) {
  throw new Error(
    "APP_ENV and EDGE_FUNCTION_INVENTORY_EVIDENCE_FILE are required.",
  );
}

const result = spawnSync(
  "supabase",
  ["functions", "list", "--project-ref", projectRef, "--output", "json"],
  { encoding: "utf8" },
);
if (result.status !== 0) {
  throw new Error(result.stderr || "Unable to list deployed Edge Functions.");
}

const values = JSON.parse(result.stdout);
if (!Array.isArray(values)) {
  throw new Error("Supabase returned an invalid Edge Function inventory.");
}
const names = values
  .map((entry) => String(entry?.name || entry?.slug || "").trim())
  .filter(Boolean)
  .sort();
const unexpected = names.filter((name) => !allowed.has(name));
if (unexpected.length > 0) {
  throw new Error(
    `Unexpected privileged Edge Functions are deployed: ${unexpected.join(", ")}`,
  );
}

const output = [
  `environment=${environment}`,
  `project_ref=${projectRef}`,
  `allowed=${[...allowed].sort().join(",")}`,
  `deployed=${names.join(",")}`,
  "unexpected=0",
  `verified_at=${new Date().toISOString()}`,
  "",
].join("\n");
const target = resolve(evidencePath);
mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
writeFileSync(target, output, { encoding: "utf8", mode: 0o600 });
console.log(`Edge Function inventory passed for ${environment}.`);
