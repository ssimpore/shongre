#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { SHONGRE_PERFORMANCE_BUDGETS } from "@shongre/contracts/performance";

const frontendRoot = resolve(import.meta.dirname, "..");
const nextRoot = resolve(frontendRoot, ".next");
const manifestPath = resolve(
  nextRoot,
  "server/app/[[...segments]]/page_client-reference-manifest.js",
);

// Generated taxonomy remains independent from executable hydration so an
// approved catalogue addition cannot conceal executable growth.
const BUDGETS = SHONGRE_PERFORMANCE_BUDGETS.clientBundle;
const ROUTE_ENTRY_SOURCES = Object.freeze({
  home: "frontend/src/features/home/HomePage.tsx",
  search: "frontend/src/features/search/SearchPage.tsx",
  automotive: "frontend/src/features/auto/AutoSearchPage.tsx",
  realEstate: "frontend/src/features/real-estate/ImmoSearchPage.tsx",
  employment: "frontend/src/features/employment/EmploymentSearchPage.tsx",
  education: "frontend/src/features/courses/CoursesSearchPage.tsx",
  listingDetail: "frontend/src/features/listings/ListingDetailPage.tsx",
});

if (!existsSync(manifestPath)) {
  throw new Error(
    "The production client manifest is missing. Run `make frontend-build` first.",
  );
}

const source = readFileSync(manifestPath, "utf8");
const assignment =
  /globalThis\.__RSC_MANIFEST\["\/\[\[\.\.\.segments\]\]\/page"\]\s*=\s*/.exec(
    source,
  );
if (!assignment || assignment.index === undefined) {
  throw new Error("The catch-all client manifest has an unsupported shape.");
}

const manifest = JSON.parse(
  source.slice(assignment.index + assignment[0].length).replace(/;\s*$/, ""),
);
const applicationEntry = Object.entries(manifest.clientModules).find(
  ([modulePath]) => modulePath.endsWith("/frontend/app/WebApplication.tsx"),
);
if (!applicationEntry) {
  throw new Error("WebApplication is missing from the client manifest.");
}
const usesWebpackChunkIds = applicationEntry[1].chunks.some(
  (chunkPath) => typeof chunkPath === "string" && !chunkPath.endsWith(".js"),
);

const rows = [
  ...new Set(
    applicationEntry[1].chunks.filter(
      (chunkPath) => typeof chunkPath === "string" && chunkPath.endsWith(".js"),
    ),
  ),
].map((chunkPath) => {
  const diskPath = resolve(
    nextRoot,
    decodeURIComponent(chunkPath.replace(/^\/_next\//, "")),
  );
  const bytes = readFileSync(diskPath);
  const sourceText = bytes.toString("utf8");
  return {
    file: basename(diskPath),
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    // Catalogue fixtures are forbidden in application bundles.
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

function routeChunkRows() {
  const chunksRoot = resolve(nextRoot, "static/chunks");
  const javascriptFiles = readdirSync(chunksRoot).filter((file) =>
    file.endsWith(".js"),
  );
  const result = {};
  for (const [route, sourcePath] of Object.entries(ROUTE_ENTRY_SOURCES)) {
    result[route] = javascriptFiles.flatMap((file) => {
      const diskPath = resolve(chunksRoot, file);
      const bytes = readFileSync(diskPath);
      const sourceMapName = bytes
        .toString("utf8")
        .match(/sourceMappingURL=([^\s]+\.js\.map)/)?.[1];
      if (!sourceMapName) return [];
      const sourceMapPath = resolve(chunksRoot, sourceMapName);
      if (!existsSync(sourceMapPath)) return [];
      const sourceMap = JSON.parse(readFileSync(sourceMapPath, "utf8"));
      const sourceSuffix = sourcePath.replace(/^frontend\//, "");
      const ownsRouteEntry = (sourceMap.sources || []).some(
        (source) =>
          source.endsWith(`/${sourcePath}`) ||
          source.endsWith(`/${sourceSuffix}`),
      );
      return ownsRouteEntry
        ? [
            {
              file,
              rawBytes: bytes.length,
              gzipBytes: gzipSync(bytes, { level: 9 }).length,
            },
          ]
        : [];
    });
  }
  return result;
}

const routes = routeChunkRows();

console.log("\nClient bundle budget");
console.log("=".repeat(50));
console.log(
  `Build chunk layout: ${usesWebpackChunkIds ? "webpack" : "turbopack"}`,
);
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
console.log("\nRoute-owned executable JavaScript");
for (const [route, routeRows] of Object.entries(routes)) {
  const routeGzipBytes = routeRows.reduce(
    (total, row) => total + row.gzipBytes,
    0,
  );
  console.log(
    `  ${route.padEnd(14)} ${kb(routeGzipBytes).padStart(10)} gzip  ${routeRows.map((row) => row.file).join(", ") || "missing"}`,
  );
}

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
if (generatedTaxonomy)
  failures.push(
    `Forbidden embedded taxonomy catalogue in ${generatedTaxonomy.file}`,
  );

for (const [route, routeRows] of Object.entries(routes)) {
  if (!routeRows.length) {
    failures.push(
      `${route} route entry ${ROUTE_ENTRY_SOURCES[route]} is missing from production source maps`,
    );
    continue;
  }
  const routeGzipBytes = routeRows.reduce(
    (total, row) => total + row.gzipBytes,
    0,
  );
  const budget = BUDGETS.routeExecutableGzipBytes[route];
  if (routeGzipBytes > budget) {
    failures.push(
      `${route} route executable is ${kb(routeGzipBytes)} gzip; budget is ${kb(budget)}`,
    );
  }
}

if (failures.length) {
  console.error("\n✖ Client bundle budget exceeded:\n");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log(
  "\n✔ client hydration and generated-data budgets are within bounds\n",
);
