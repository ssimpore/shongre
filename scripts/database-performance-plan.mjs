#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  SHONGRE_PERFORMANCE_BUDGETS,
  SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS,
} from "@shongre/contracts/performance";

function boundedInteger(raw, fallback, name, minimum, maximum) {
  const value = Number(raw ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer from ${minimum} through ${maximum}`,
    );
  }
  return value;
}

function assertIsolatedTarget(connection) {
  if (!connection) {
    throw new Error(
      "PERFORMANCE_DATABASE_URL is required; use a disposable local/test PostgreSQL database",
    );
  }
  if (!new Set(["local", "test"]).has(process.env.APP_ENV || "")) {
    throw new Error(
      "The synthetic query-plan probe is restricted to APP_ENV=local or test",
    );
  }
  if (/^postgres(?:ql)?:\/\//.test(connection)) {
    const parsed = new URL(connection);
    if (parsed.username || parsed.password) {
      throw new Error(
        "Use local peer authentication; credentials are not accepted by this probe",
      );
    }
    if (
      parsed.hostname &&
      !["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
    ) {
      throw new Error(
        "The synthetic query-plan probe refuses non-loopback databases",
      );
    }
  } else if (connection !== "postgres") {
    throw new Error(
      "Use the local postgres database name or a loopback PostgreSQL URL",
    );
  }
}

function allPlanNodes(node) {
  return [node, ...(node.Plans || []).flatMap(allPlanNodes)];
}

export function runDatabasePerformancePlan(overrides = {}) {
  const connection =
    overrides.connection || process.env.PERFORMANCE_DATABASE_URL || "";
  assertIsolatedTarget(connection);
  const rowCount = boundedInteger(
    overrides.rowCount || process.env.PERFORMANCE_DATASET_ROWS,
    SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.performancePlanRows,
    "PERFORMANCE_DATASET_ROWS",
    SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.performancePlanMinimumRows,
    SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.performancePlanMaximumRows,
  );
  const queryBudgetMs = boundedInteger(
    overrides.queryBudgetMs || process.env.PERFORMANCE_QUERY_BUDGET_MS,
    SHONGRE_PERFORMANCE_BUDGETS.database.interactiveQueryP95Ms,
    "PERFORMANCE_QUERY_BUDGET_MS",
    10,
    10_000,
  );
  const statementTimeoutMs = boundedInteger(
    overrides.statementTimeoutMs ||
      process.env.PERFORMANCE_PLAN_STATEMENT_TIMEOUT_MS,
    SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database
      .performancePlanStatementTimeoutMs,
    "PERFORMANCE_PLAN_STATEMENT_TIMEOUT_MS",
    1_000,
    600_000,
  );
  const lockTimeoutMs = boundedInteger(
    overrides.lockTimeoutMs || process.env.PERFORMANCE_PLAN_LOCK_TIMEOUT_MS,
    SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.performancePlanLockTimeoutMs,
    "PERFORMANCE_PLAN_LOCK_TIMEOUT_MS",
    100,
    30_000,
  );

  const sql = String.raw`
    BEGIN;
    SET statement_timeout = '${statementTimeoutMs}ms';
    SET lock_timeout = '${lockTimeoutMs}ms';
    SET max_parallel_workers_per_gather = 0;
    CREATE TEMP TABLE perf_listings (
      id bigint PRIMARY KEY,
      market_code text NOT NULL,
      status text NOT NULL,
      title text NOT NULL,
      price numeric(12,2) NOT NULL,
      organic_freshness_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL
    ) ON COMMIT DROP;
    CREATE TEMP TABLE perf_listing_market_publications (
      listing_id bigint NOT NULL,
      market_code text NOT NULL,
      status text NOT NULL,
      compliance_state text NOT NULL,
      price_minor bigint NOT NULL,
      sort_date timestamptz NOT NULL,
      PRIMARY KEY (listing_id, market_code)
    ) ON COMMIT DROP;
    CREATE INDEX perf_listings_organic_discovery_idx
      ON perf_listings (market_code, status, organic_freshness_at DESC, id)
      WHERE status = 'published';
    CREATE INDEX perf_listing_market_discovery_idx
      ON perf_listing_market_publications
      (market_code, status, sort_date DESC, listing_id);
    INSERT INTO perf_listings
    SELECT sequence,
      (ARRAY['FR','BE','CH','SN','BF'])[(sequence % 5) + 1],
      CASE WHEN sequence % 10 = 0 THEN 'archived' ELSE 'published' END,
      'Representative listing ' || sequence,
      ((sequence % 500000) + 100)::numeric / 100,
      now() - (sequence % 7776000) * interval '1 second',
      now() - (sequence % 15552000) * interval '1 second'
    FROM generate_series(1, ${rowCount}) AS sequence;
    INSERT INTO perf_listing_market_publications
    SELECT id,
      CASE WHEN id % 11 = 0 THEN 'BE' ELSE market_code END,
      CASE WHEN id % 13 = 0 THEN 'paused' ELSE 'active' END,
      CASE WHEN id % 17 = 0 THEN 'restricted' ELSE 'approved' END,
      round(price * 100)::bigint,
      organic_freshness_at
    FROM perf_listings;
    ANALYZE perf_listings;
    ANALYZE perf_listing_market_publications;
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT l.id, l.title, l.price, p.price_minor, p.sort_date
    FROM perf_listing_market_publications AS p
    JOIN perf_listings AS l ON l.id = p.listing_id
    WHERE p.market_code = 'FR'
      AND p.status = 'active'
      AND p.compliance_state = 'approved'
      AND p.sort_date <= now()
      AND l.status = 'published'
    ORDER BY p.sort_date DESC, p.listing_id DESC
    LIMIT 50;
    ROLLBACK;
  `;
  const execution = spawnSync(
    "psql",
    ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", connection],
    { input: sql, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  if (execution.status !== 0) {
    throw new Error(`PostgreSQL plan probe failed: ${execution.stderr.trim()}`);
  }
  const plan = JSON.parse(execution.stdout.trim())[0];
  const nodes = allPlanNodes(plan.Plan);
  const scanTypes = [...new Set(nodes.map((node) => node["Node Type"]))];
  const indexNames = [
    ...new Set(nodes.map((node) => node["Index Name"]).filter(Boolean)),
  ];
  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    datasetRows: rowCount,
    query: "anonymous-market-discovery-candidate-page",
    executionTimeMs: plan["Execution Time"],
    planningTimeMs: plan["Planning Time"],
    resultRows: plan.Plan["Actual Rows"],
    scanTypes,
    indexNames,
    sharedHitBlocks: nodes.reduce(
      (total, node) => total + Number(node["Shared Hit Blocks"] || 0),
      0,
    ),
    sharedReadBlocks: nodes.reduce(
      (total, node) => total + Number(node["Shared Read Blocks"] || 0),
      0,
    ),
    budgetMs: queryBudgetMs,
    result:
      plan["Execution Time"] <= queryBudgetMs &&
      indexNames.some((name) => name.includes("market_discovery"))
        ? "PASS"
        : "FAIL",
  };
  const evidencePath =
    overrides.evidencePath || process.env.DATABASE_PERFORMANCE_EVIDENCE_FILE;
  if (evidencePath) {
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
  }
  if (evidence.result !== "PASS") {
    throw new Error(
      `Query plan exceeded ${queryBudgetMs} ms or did not use the existing market-discovery index: ${JSON.stringify(evidence)}`,
    );
  }
  return evidence;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href
) {
  console.log(JSON.stringify(runDatabasePerformancePlan(), null, 2));
}
