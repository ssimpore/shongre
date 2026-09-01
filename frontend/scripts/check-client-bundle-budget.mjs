#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const frontendRoot = resolve(import.meta.dirname, "..");
const nextRoot = resolve(frontendRoot, ".next");
const manifestPath = resolve(
  nextRoot,
  "server/app/[[...segments]]/page_client-reference-manifest.js",
);

const BUDGETS = {
  // Generated taxonomy is measured independently below. Keeping it out of the
  // executable hydration cap means an approved taxonomy addition cannot hide
  // executable growth or fail the same bytes against two separate budgets.
  initialExecutableRawBytes: 1_725_000,
  initialExecutableGzipBytes: 449_000,
  executableChunkGzipBytes: 110_000,
  generatedTaxonomyChunkGzipBytes: 650_000,
};

if (!existsSync(manifestPath)) {
  throw new Error(
    "The production client manifest is missing. Run `make frontend-build` first.",
  );
}

const source = readFileSync(manifestPath, "utf8");
const assignmentMarker =
  'globalThis.__RSC_MANIFEST["/[[...segments]]/page"] = ';
const assignmentStart = source.indexOf(assignmentMarker);
if (assignmentStart < 0) {
  throw new Error("The catch-all client manifest has an unsupported shape.");
}

const manifest = JSON.parse(
  source.slice(assignmentStart + assignmentMarker.length).replace(/;\s*$/, ""),
);
const applicationEntry = Object.entries(manifest.clientModules).find(
  ([modulePath]) => modulePath.endsWith("/frontend/app/WebApplication.tsx"),
);
if (!applicationEntry) {
  throw new Error("WebApplication is missing from the client manifest.");
}

const rows = [...new Set(applicationEntry[1].chunks)].map((chunkPath) => {
  const diskPath = resolve(nextRoot, chunkPath.replace(/^\/_next\//, ""));
  const bytes = readFileSync(diskPath);
  const sourceText = bytes.toString("utf8");
  return {
    file: basename(diskPath),
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    // The generated v4 projection is stored as one compressed base64 literal.
    // Call sites also retain its exported function name, so that name alone
    // would misclassify small executable chunks as the generated payload.
    isGeneratedTaxonomy: /[A-Za-z0-9+/]{500000,}={0,2}/.test(sourceText),
  };
});

const totals = rows.reduce(
  (sum, row) => ({
    rawBytes: sum.rawBytes + row.rawBytes,
    gzipBytes: sum.gzipBytes + row.gzipBytes,
  }),
  { rawBytes: 0, gzipBytes: 0 },
);
const executableTotals = rows
  .filter((row) => !row.isGeneratedTaxonomy)
  .reduce(
    (sum, row) => ({
      rawBytes: sum.rawBytes + row.rawBytes,
      gzipBytes: sum.gzipBytes + row.gzipBytes,
    }),
    { rawBytes: 0, gzipBytes: 0 },
  );
const largestExecutable = rows
  .filter((row) => !row.isGeneratedTaxonomy)
  .sort((left, right) => right.gzipBytes - left.gzipBytes)[0];
const generatedTaxonomy = rows.find((row) => row.isGeneratedTaxonomy);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

console.log("\nClient bundle budget");
console.log("=".repeat(50));
console.log(`Initial client JavaScript: ${kb(totals.gzipBytes)} gzip`);
console.log(`Initial client JavaScript: ${kb(totals.rawBytes)} raw`);
console.log(
  `Executable hydration: ${kb(executableTotals.gzipBytes)} gzip / ${kb(executableTotals.rawBytes)} raw`,
);
console.log(
  `Largest executable chunk: ${kb(largestExecutable?.gzipBytes ?? 0)} gzip (${largestExecutable?.file ?? "none"})`,
);
console.log(
  `Generated taxonomy chunk: ${kb(generatedTaxonomy?.gzipBytes ?? 0)} gzip (${generatedTaxonomy?.file ?? "none"})`,
);

const failures = [];
if (executableTotals.rawBytes > BUDGETS.initialExecutableRawBytes)
  failures.push(
    `executable hydration ${kb(executableTotals.rawBytes)} raw exceeds ${kb(BUDGETS.initialExecutableRawBytes)}`,
  );
if (executableTotals.gzipBytes > BUDGETS.initialExecutableGzipBytes)
  failures.push(
    `executable hydration ${kb(executableTotals.gzipBytes)} gzip exceeds ${kb(BUDGETS.initialExecutableGzipBytes)}`,
  );
if (
  largestExecutable &&
  largestExecutable.gzipBytes > BUDGETS.executableChunkGzipBytes
)
  failures.push(
    `executable chunk ${largestExecutable.file} is ${kb(largestExecutable.gzipBytes)}; budget is ${kb(BUDGETS.executableChunkGzipBytes)}`,
  );
if (
  generatedTaxonomy &&
  generatedTaxonomy.gzipBytes > BUDGETS.generatedTaxonomyChunkGzipBytes
)
  failures.push(
    `generated taxonomy chunk ${generatedTaxonomy.file} is ${kb(generatedTaxonomy.gzipBytes)}; budget is ${kb(BUDGETS.generatedTaxonomyChunkGzipBytes)}`,
  );

if (failures.length) {
  console.error("\n✖ Client bundle budget exceeded:\n");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log(
  "\n✔ client hydration and generated-data budgets are within bounds\n",
);
