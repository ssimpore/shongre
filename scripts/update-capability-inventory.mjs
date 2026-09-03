#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const docUrl = new URL(
  "docs/architecture/production-capability-matrix.md",
  root,
);
const spec = JSON.parse(
  readFileSync(new URL("backend/openapi/openapi.json", root), "utf8"),
);
const methods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
]);
const operations = Object.values(spec.paths).reduce(
  (total, item) =>
    total + Object.keys(item).filter((key) => methods.has(key)).length,
  0,
);
const pathCount = Object.keys(spec.paths).length;
const manifest = readFileSync(
  new URL("backend/src/generated/openapi-manifest.ts", root),
  "utf8",
);
const runtimeRoutes = manifest.match(/operationId:/g)?.length || 0;
const migrations = readdirSync(new URL("backend/supabase/migrations/", root))
  .filter((name) => name.endsWith(".sql"))
  .sort();

const testRoots = ["frontend/src", "backend/tests", "mobile/tests", "packages"];
const tests = [];
const visit = (path) => {
  for (const name of readdirSync(path)) {
    const child = join(path, name);
    const metadata = statSync(child);
    if (metadata.isDirectory()) {
      if (name !== "node_modules" && name !== "e2e") visit(child);
    } else if (/\.(test|spec)\.(ts|tsx)$/.test(name)) {
      tests.push(relative(new URL(".", root).pathname, child));
    }
  }
};
for (const testRoot of testRoots) visit(new URL(`${testRoot}/`, root).pathname);

const block = `<!-- capability-inventory:start -->\n\nCurrent generated repository inventory: ${operations} OpenAPI operations across ${pathCount}\npaths, including ${runtimeRoutes} runtime routes, and ${migrations.length} ordered migrations through\n\`${migrations.at(-1)}\`. There are ${tests.length} non-E2E test source files.\n<!-- capability-inventory:end -->`;
const current = readFileSync(docUrl, "utf8");
const next = current.replace(
  /<!-- capability-inventory:start -->[\s\S]*?<!-- capability-inventory:end -->/,
  block,
);
if (current === next && !current.includes(block))
  throw new Error("Capability inventory marker is missing or duplicated.");

if (process.argv.includes("--check")) {
  if (current !== next) {
    console.error(
      "Capability inventory is stale. Run `make capability-inventory-update`.",
    );
    process.exit(1);
  }
  console.log(
    `Capability inventory is current (${operations} operations, ${migrations.length} migrations, ${tests.length} test files).`,
  );
} else {
  writeFileSync(docUrl, next);
  console.log("Updated docs/architecture/production-capability-matrix.md.");
}
