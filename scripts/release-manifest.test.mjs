import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

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
      suites: [
        {
          specs: [
            "serves the international gateway with environment-safe headers",
            "serves the France marketplace with environment-safe headers",
            "serves each canonical Shongre application hostname",
            "serves live and ready API probes through the Tunnel",
            "returns a market-scoped public listings feed",
          ].map((title) => ({
            title,
            tests: [{ results: [{ status: "passed" }] }],
          })),
        },
      ],
      stats: { expected: 5, skipped: 0, unexpected: 0, duration: 1234 },
    }),
  );
  writeFileSync(
    performanceEvidence,
    JSON.stringify({
      schemaVersion: 1,
      environment: "staging",
      release: sha,
      scope: "MARKET_SCOPED",
      marketCode: "FR",
      verifiedAt: "2026-08-27T10:00:00.000Z",
      result: "PASS",
      budgets: { p95Ms: 750, minimumSuccessRate: 0.99 },
      endpoints: ["liveness", "readiness", "marketplace_listings"].map(
        (name) => ({ name, successRate: 1, p95Ms: 20 }),
      ),
    }),
  );
  run(["create", output, sha, "example/shongre", frontend, backend]);
  run(["validate", output, sha]);
  run(["certify", output, certification, hostedReport, performanceEvidence]);
  run(["verify-certification", output, certification]);
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
  report.stats.unexpected = 1;
  writeFileSync(hostedReport, JSON.stringify(report));
  run(["certify", output, certification, hostedReport, performanceEvidence], 1);
  console.log("Release manifest build-once invariants passed.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
