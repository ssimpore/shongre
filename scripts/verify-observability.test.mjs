import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { verifyObservability } from "./verify-observability.mjs";

const release = "b".repeat(40);
const directory = mkdtempSync(resolve(tmpdir(), "shongre-observability-"));
const evidencePath = resolve(directory, "observability.json");
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("X-Request-Id", request.headers["x-request-id"] || "");
  response.end(
    JSON.stringify({
      status: request.url === "/readyz" ? "ready" : "ok",
      environment: "staging",
      release,
    }),
  );
});

try {
  await new Promise((resolveStarted) => server.listen(0, resolveStarted));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("server unavailable");
  const origin = `http://127.0.0.1:${address.port}`;
  const evidence = await verifyObservability({
    apiUrl: origin,
    expectedEnvironment: "staging",
    expectedRelease: release,
    dashboardUrl: `${origin}/dashboard`,
    alertPolicyUrl: `${origin}/alerts`,
    onCallRunbookUrl: `${origin}/runbook`,
    logDrainConfirmed: true,
    traceLookupConfirmed: true,
    alertDeliveryConfirmed: true,
    onCallConfirmed: true,
    evidencePath,
    allowInsecure: true,
  });
  if (evidence.result !== "PASS" || evidence.probes.length !== 2) {
    throw new Error("observability probe evidence did not pass");
  }
  const persisted = JSON.parse(readFileSync(evidencePath, "utf8"));
  if (persisted.checks.request_id_propagation !== "PASS") {
    throw new Error("request-id evidence was not persisted");
  }
  console.log("Observability probe and evidence invariants passed.");
} finally {
  await new Promise((resolveClosed) => server.close(resolveClosed));
  rmSync(directory, { recursive: true, force: true });
}
