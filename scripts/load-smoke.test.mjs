import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runLoadSmoke } from "./load-smoke.mjs";
import assert from "node:assert/strict";
import { validatePerformanceEvidence } from "./lib/release-evidence.mjs";

const release = "a".repeat(40);
const directory = mkdtempSync(resolve(tmpdir(), "shongre-load-smoke-"));
const evidencePath = resolve(directory, "performance.json");
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/livez") {
    response.end(
      JSON.stringify({ status: "ok", environment: "staging", release }),
    );
    return;
  }
  if (request.url === "/readyz") {
    response.end(
      JSON.stringify({ status: "ready", environment: "staging", release }),
    );
    return;
  }
  if (
    request.method === "GET" &&
    request.url === "/api/v1/listings?marketCode=FR"
  ) {
    response.end(JSON.stringify({ listings: [], total: 0 }));
    return;
  }
  if (request.method === "POST" && request.url === "/api/v1/listings/search") {
    response.end(
      JSON.stringify({ items: [], total: 0, page: 1, totalPages: 1 }),
    );
    return;
  }
  if (
    request.method === "GET" &&
    request.url ===
      "/api/v1/listings/search?marketCode=FR&limit=20&sortBy=date_desc"
  ) {
    // Discovery is excluded from every cache until purge delivery is proven.
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.end(
      JSON.stringify({ items: [], total: 0, page: 1, totalPages: 1 }),
    );
    return;
  }
  const conditional = {
    "/api/v1/markets/effective/FR": {
      etag: '"test-reference-etag"',
      cacheControl:
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400",
      cacheTag: "shongre-v1-markets,shongre-v1-market-fr",
      body: { code: "FR" },
    },
    "/api/v1/taxonomy/v1/header-navigation": {
      etag: '"test-taxonomy-etag"',
      cacheControl: "private, no-cache",
      cacheTag: null,
      body: { items: [] },
    },
  }[request.url];
  if (request.method === "GET" && conditional) {
    response.setHeader("Cache-Control", conditional.cacheControl);
    if (conditional.cacheTag)
      response.setHeader("Cache-Tag", conditional.cacheTag);
    response.setHeader("Vary", "X-Shongre-Market, Accept-Language");
    response.setHeader("ETag", conditional.etag);
    if (request.headers["if-none-match"] === conditional.etag) {
      response.statusCode = 304;
      response.end();
      return;
    }
    response.end(JSON.stringify(conditional.body));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: "not found" }));
});

try {
  await new Promise((resolveStarted) => server.listen(0, resolveStarted));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("server unavailable");
  const evidence = await runLoadSmoke({
    apiUrl: `http://127.0.0.1:${address.port}`,
    allowInsecure: true,
    expectedEnvironment: "staging",
    expectedRelease: release,
    marketCode: "FR",
    requestCount: 4,
    concurrency: 2,
    p95BudgetMs: 1_000,
    minimumSuccessRate: 1,
    evidencePath,
  });
  if (evidence.result !== "PASS") throw new Error("load evidence did not pass");
  if (
    evidence.conditionalCache.result !== "PASS" ||
    evidence.conditionalCache.shared.conditionalStatus !== 304 ||
    evidence.conditionalCache.revalidate.conditionalStatus !== 304
  ) {
    throw new Error("conditional cache evidence did not pass");
  }
  const persisted = JSON.parse(readFileSync(evidencePath, "utf8"));
  // Exercise the actual producer output through the release consumer contract.
  assert.equal(validatePerformanceEvidence(persisted, release), persisted);
  for (const changed of [
    { schemaVersion: 1 },
    { release: "b".repeat(40) },
    { conditionalCache: { result: "FAIL" } },
    {
      endpoints: persisted.endpoints.filter(
        (endpoint) => endpoint.name !== "marketplace_search",
      ),
    },
    {
      endpoints: persisted.endpoints.map((endpoint) => ({
        ...endpoint,
        successRate: 0,
      })),
    },
  ])
    assert.throws(() =>
      validatePerformanceEvidence({ ...persisted, ...changed }, release),
    );
  if (persisted.scope !== "MARKET_SCOPED" || persisted.marketCode !== "FR") {
    throw new Error("load evidence lost its market scope");
  }
  console.log("Hosted load-smoke budgets and evidence invariants passed.");
} finally {
  await new Promise((resolveClosed) => server.close(resolveClosed));
  rmSync(directory, { recursive: true, force: true });
}
