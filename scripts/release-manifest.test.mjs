import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  PERFORMANCE_EVIDENCE_VERSION,
  REQUIRED_PERFORMANCE_ENDPOINTS,
  REQUIRED_HOSTED_SMOKE_TESTS,
} from "./lib/release-evidence.mjs";

const root = resolve(import.meta.dirname, "..");
const directory = mkdtempSync(resolve(tmpdir(), "shongre-release-"));
const output = resolve(directory, "release.json");
const certification = resolve(directory, "certification.json");
const hostedReport = resolve(directory, "hosted-report.json");
const performanceEvidence = resolve(directory, "performance.json");
const sha = "a".repeat(40);
const frontend = `ghcr.io/example/shongre-frontend@sha256:${"b".repeat(64)}`;
const backend = `ghcr.io/example/shongre-backend@sha256:${"c".repeat(64)}`;

function run(args, expectedStatus = 0) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/release-manifest.mjs"), ...args],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== expectedStatus) {
    throw new Error(
      result.stderr || result.stdout || `unexpected status ${result.status}`,
    );
  }
}

try {
  writeFileSync(
    hostedReport,
    JSON.stringify({
      config: { metadata: { environment: "staging", release: sha } },
      suites: [
        {
          specs: REQUIRED_HOSTED_SMOKE_TESTS.map((title) => ({
            title,
            tests: [{ results: [{ status: "passed" }] }],
          })),
        },
      ],
      stats: {
        expected: REQUIRED_HOSTED_SMOKE_TESTS.length,
        skipped: 0,
        unexpected: 0,
        duration: 1234,
      },
    }),
  );
  writeFileSync(
    performanceEvidence,
    JSON.stringify({
      schemaVersion: PERFORMANCE_EVIDENCE_VERSION,
      environment: "staging",
      release: sha,
      scope: "MARKET_SCOPED",
      marketCode: "FR",
      verifiedAt: "2026-08-27T10:00:00.000Z",
      result: "PASS",
      budgets: { p95Ms: 750, minimumSuccessRate: 0.99 },
      configuration: { requestCount: 4, concurrency: 2, timeoutMs: 1_000 },
      conditionalCache: {
        result: "PASS",
        shared: { result: "PASS", etag: true, conditionalStatus: 304 },
        revalidate: { result: "PASS", etag: true, conditionalStatus: 304 },
      },
      endpoints: REQUIRED_PERFORMANCE_ENDPOINTS.map((name) => ({
        name,
        requests: 4,
        validResponses: 4,
        successRate: 1,
        p50Ms: 10,
        p95Ms: 20,
        p99Ms: 30,
        statuses: { 200: 4 },
      })),
    }),
  );
  run(["create", output, sha, "example/shongre", frontend, backend]);
  run(["validate", output, sha]);
  run(["certify", output, certification, hostedReport, performanceEvidence]);
  run(["verify-certification", output, certification]);
  const validCertification = JSON.parse(readFileSync(certification, "utf8"));
  for (const mutate of [
    (value) => {
      value.checks.hostedSmoke.requiredTests.pop();
    },
    (value) => {
      delete value.checks.hostedSmoke.expected;
    },
    (value) => {
      value.checks.hostedSmoke.flaky = 1;
    },
    (value) => {
      value.checks.performance.schemaVersion = 1;
    },
    (value) => {
      value.checks.performance.endpoints[0].successRate = 0;
    },
    (value) => {
      value.checks.performance.conditionalCache.shared.conditionalStatus = 200;
    },
    (value) => {
      value.checks.performance.reportDigest = "missing";
    },
  ]) {
    const invalidCertification = structuredClone(validCertification);
    mutate(invalidCertification);
    writeFileSync(certification, JSON.stringify(invalidCertification));
    run(["verify-certification", output, certification], 1);
  }
  writeFileSync(certification, JSON.stringify(validCertification));
  const manifest = JSON.parse(readFileSync(output, "utf8"));
  if (
    manifest.images.frontend.reference !== frontend ||
    manifest.images.backend.reference !== backend
  ) {
    throw new Error("manifest did not retain exact image digests");
  }
  const invalid = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/release-manifest.mjs"),
      "validate",
      output,
      "d".repeat(40),
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (invalid.status === 0) throw new Error("mismatched release was accepted");

  const report = JSON.parse(readFileSync(hostedReport, "utf8"));
  for (const mutate of [
    (value) => {
      value.config.metadata.release = "d".repeat(40);
    },
    (value) => {
      value.suites[0].specs.pop();
    },
    (value) => {
      value.stats.skipped = 1;
    },
    (value) => {
      value.stats.flaky = 1;
    },
    (value) => {
      value.suites[0].specs[0].tests[0].results.unshift({ status: "failed" });
    },
  ]) {
    const invalidReport = structuredClone(report);
    mutate(invalidReport);
    writeFileSync(hostedReport, JSON.stringify(invalidReport));
    run(
      ["certify", output, certification, hostedReport, performanceEvidence],
      1,
    );
  }
  report.stats.unexpected = 1;
  writeFileSync(hostedReport, JSON.stringify(report));
  run(["certify", output, certification, hostedReport, performanceEvidence], 1);
  console.log("Release manifest build-once invariants passed.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
