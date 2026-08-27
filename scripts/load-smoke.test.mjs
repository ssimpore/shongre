import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runLoadSmoke } from "./load-smoke.mjs";

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
  if (request.url === "/api/v1/listings?marketCode=FR") {
    response.end(JSON.stringify({ listings: [], total: 0 }));
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
  const persisted = JSON.parse(readFileSync(evidencePath, "utf8"));
  if (persisted.scope !== "MARKET_SCOPED" || persisted.marketCode !== "FR") {
    throw new Error("load evidence lost its market scope");
  }
  console.log("Hosted load-smoke budgets and evidence invariants passed.");
} finally {
  await new Promise((resolveClosed) => server.close(resolveClosed));
  rmSync(directory, { recursive: true, force: true });
}
