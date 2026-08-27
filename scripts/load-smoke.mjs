#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

function validateTarget(input, allowInsecure) {
  const target = new URL(input);
  if (target.username || target.password || target.pathname !== "/") {
    throw new Error("LOAD_TEST_API_URL must be a credential-free origin");
  }
  if (!allowInsecure && target.protocol !== "https:") {
    throw new Error("LOAD_TEST_API_URL must use HTTPS");
  }
  return target;
}

async function measureEndpoint({
  api,
  endpoint,
  headers,
  requestCount,
  concurrency,
  timeoutMs,
}) {
  const durations = [];
  const statuses = new Map();
  let next = 0;
  let validResponses = 0;

  const worker = async () => {
    while (next < requestCount) {
      next += 1;
      const startedAt = performance.now();
      let status = 0;
      try {
        const response = await fetch(new URL(endpoint.path, api), {
          headers,
          signal: AbortSignal.timeout(timeoutMs),
        });
        status = response.status;
        const payload = await response.json();
        if (response.ok && endpoint.validate(payload)) validResponses += 1;
      } catch {
        status = 0;
      }
      durations.push(performance.now() - startedAt);
      statuses.set(status, (statuses.get(status) || 0) + 1);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()),
  );
  return {
    name: endpoint.name,
    path: endpoint.path,
    requests: requestCount,
    validResponses,
    successRate: validResponses / requestCount,
    p50Ms: Math.round(percentile(durations, 0.5)),
    p95Ms: Math.round(percentile(durations, 0.95)),
    p99Ms: Math.round(percentile(durations, 0.99)),
    statuses: Object.fromEntries(
      [...statuses.entries()].map(([status, count]) => [String(status), count]),
    ),
  };
}

export async function runLoadSmoke(overrides = {}) {
  const expectedEnvironment =
    overrides.expectedEnvironment || process.env.LOAD_TEST_EXPECTED_ENVIRONMENT;
  const expectedRelease =
    overrides.expectedRelease || process.env.LOAD_TEST_EXPECTED_RELEASE;
  const marketCode = (
    overrides.marketCode ||
    process.env.LOAD_TEST_MARKET ||
    "FR"
  ).toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketCode)) {
    throw new Error("LOAD_TEST_MARKET must be a two-letter market code");
  }
  if (!expectedEnvironment || !expectedRelease) {
    throw new Error(
      "LOAD_TEST_EXPECTED_ENVIRONMENT and LOAD_TEST_EXPECTED_RELEASE are required",
    );
  }
  if (!/^[0-9a-f]{40}$/.test(expectedRelease)) {
    throw new Error("LOAD_TEST_EXPECTED_RELEASE must be a full commit SHA");
  }
  if (
    expectedEnvironment === "production" &&
    !overrides.allowProduction &&
    process.env.ALLOW_PRODUCTION_LOAD_TEST !== "true"
  ) {
    throw new Error(
      "Production load smoke requires ALLOW_PRODUCTION_LOAD_TEST=true",
    );
  }

  const api = validateTarget(
    overrides.apiUrl || process.env.LOAD_TEST_API_URL || "",
    Boolean(overrides.allowInsecure),
  );
  const requestCount = positiveInteger(
    overrides.requestCount || process.env.LOAD_TEST_REQUESTS,
    60,
    "LOAD_TEST_REQUESTS",
  );
  const concurrency = positiveInteger(
    overrides.concurrency || process.env.LOAD_TEST_CONCURRENCY,
    6,
    "LOAD_TEST_CONCURRENCY",
  );
  const timeoutMs = positiveInteger(
    overrides.timeoutMs || process.env.LOAD_TEST_TIMEOUT_MS,
    10_000,
    "LOAD_TEST_TIMEOUT_MS",
  );
  const p95BudgetMs = positiveInteger(
    overrides.p95BudgetMs || process.env.LOAD_TEST_P95_MS,
    750,
    "LOAD_TEST_P95_MS",
  );
  const minimumSuccessRate = Number(
    overrides.minimumSuccessRate ??
      process.env.LOAD_TEST_MIN_SUCCESS_RATE ??
      0.99,
  );
  if (minimumSuccessRate <= 0 || minimumSuccessRate > 1) {
    throw new Error(
      "LOAD_TEST_MIN_SUCCESS_RATE must be greater than 0 and at most 1",
    );
  }

  const headers = {
    Accept: "application/json",
    Referer: overrides.referer || process.env.LOAD_TEST_REFERER || "",
    "X-Request-Id": `load-smoke-${expectedRelease.slice(0, 12)}`,
    "X-Shongre-Market": marketCode,
  };
  const endpoints = [
    {
      name: "liveness",
      path: "/livez",
      validate: (payload) =>
        payload?.environment === expectedEnvironment &&
        payload?.release === expectedRelease,
    },
    {
      name: "readiness",
      path: "/readyz",
      validate: (payload) =>
        payload?.status === "ready" &&
        payload?.environment === expectedEnvironment &&
        payload?.release === expectedRelease,
    },
    {
      name: "marketplace_listings",
      path: `/api/v1/listings?marketCode=${marketCode}`,
      validate: (payload) =>
        Array.isArray(payload?.listings) && Number.isFinite(payload?.total),
    },
  ];
  const results = [];
  for (const endpoint of endpoints) {
    results.push(
      await measureEndpoint({
        api,
        endpoint,
        headers,
        requestCount,
        concurrency,
        timeoutMs,
      }),
    );
  }

  const failed = results.filter(
    (result) =>
      result.successRate < minimumSuccessRate || result.p95Ms > p95BudgetMs,
  );
  const evidence = {
    schemaVersion: 1,
    environment: expectedEnvironment,
    release: expectedRelease,
    scope: "MARKET_SCOPED",
    marketCode,
    verifiedAt: new Date().toISOString(),
    result: failed.length === 0 ? "PASS" : "FAIL",
    budgets: { p95Ms: p95BudgetMs, minimumSuccessRate },
    configuration: { requestCount, concurrency, timeoutMs },
    endpoints: results,
  };
  const evidencePath =
    overrides.evidencePath || process.env.PERFORMANCE_EVIDENCE_FILE;
  if (evidencePath) {
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
  }
  if (failed.length > 0) {
    throw new Error(
      `Load smoke failed: ${failed.map(({ name }) => name).join(", ")}`,
    );
  }
  return evidence;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runLoadSmoke()
    .then((evidence) => {
      console.log(
        `Load smoke passed ${evidence.endpoints.length} endpoints for ${evidence.marketCode}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
