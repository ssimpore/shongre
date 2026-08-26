#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const runtimeRoots = [
  "frontend/app/",
  "frontend/src/",
  "backend/src/",
  "mobile/src/",
  "packages/",
];
const individualRuntimeFiles = new Set(["mobile/app.config.ts"]);
const allowedLocalHostFiles = new Set([
  "backend/src/integrations/providers/safe-provider-url.ts",
  "frontend/src/domains/market/market-routing.ts",
  "packages/contracts/src/market-country.ts",
]);

const files = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter(
    (file) =>
      individualRuntimeFiles.has(file) ||
      runtimeRoots.some((runtimeRoot) => file.startsWith(runtimeRoot)),
  )
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file))
  .filter((file) => !/(?:^|\/)(?:generated|fixtures|mocks)(?:\/|$)/.test(file))
  .filter((file) => !/\.(?:test|spec)\.[^.]+$/.test(file));

const deploymentHostPattern =
  /\b(?:(?:api(?:-dev|-staging)?)\.)?shongre\.(?:fr|com)\b/gi;
const loopbackUrlPattern = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi;
const findings = [];

function isEmailDomain(line, index) {
  const tokenStart = Math.max(
    line.lastIndexOf(" ", index),
    line.lastIndexOf('"', index),
    line.lastIndexOf("'", index),
    line.lastIndexOf("`", index),
    line.lastIndexOf("(", index),
  );
  return line.slice(tokenStart + 1, index).includes("@");
}

for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  for (const [offset, line] of content.split("\n").entries()) {
    deploymentHostPattern.lastIndex = 0;
    for (const match of line.matchAll(deploymentHostPattern)) {
      if (isEmailDomain(line, match.index)) continue;
      findings.push(`${file}:${offset + 1}: deployment hostname ${match[0]}`);
    }
    if (!allowedLocalHostFiles.has(file) && loopbackUrlPattern.test(line)) {
      findings.push(`${file}:${offset + 1}: fixed loopback URL`);
    }
    loopbackUrlPattern.lastIndex = 0;
  }
}

if (findings.length > 0) {
  console.error("Runtime hostname policy failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  console.error(
    "Use the typed environment/market URL configuration. Documentation, tests, migrations and infrastructure declarations are intentionally outside this runtime scan.",
  );
  process.exit(1);
}

console.log(
  `Runtime hostname policy passed (${files.length} source files scanned).`,
);
