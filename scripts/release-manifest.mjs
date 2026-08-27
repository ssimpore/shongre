import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  throw new Error(`[Release Manifest] ${message}`);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function fileDigest(relativePath) {
  return sha256(readFileSync(resolve(root, relativePath)));
}

function migrationState() {
  const directory = resolve(root, "backend/supabase/migrations");
  const files = readdirSync(directory)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  if (files.length === 0) fail("no source-controlled migrations found");
  const content = files
    .map(
      (file) => `${file}\0${readFileSync(resolve(directory, file), "utf8")}\0`,
    )
    .join("");
  return {
    revision: files.at(-1).replace(/\.sql$/, ""),
    digest: sha256(content),
  };
}

function image(value, name) {
  const match = /^([^@\s]+)@(sha256:[0-9a-f]{64})$/.exec(value);
  if (!match)
    fail(`${name} must be an immutable registry reference with @sha256`);
  return { reference: value, digest: match[2] };
}

function assertSha(value, name) {
  if (!/^[0-9a-f]{40}$/.test(value))
    fail(`${name} must be a full Git commit SHA`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const REQUIRED_HOSTED_SMOKE_TESTS = [
  "serves the international gateway with environment-safe headers",
  "serves the France marketplace with environment-safe headers",
  "serves live and ready API probes through the Tunnel",
  "returns a market-scoped public listings feed",
];

function playwrightSpecs(suites = []) {
  return suites.flatMap((suite) => [
    ...(suite.specs || []),
    ...playwrightSpecs(suite.suites || []),
  ]);
}

function validateHostedSmokeReport(path) {
  const report = readJson(path);
  const specs = playwrightSpecs(report.suites);
  const byTitle = new Map(specs.map((spec) => [spec.title, spec]));
  for (const title of REQUIRED_HOSTED_SMOKE_TESTS) {
    const spec = byTitle.get(title);
    if (!spec) fail(`hosted smoke report is missing: ${title}`);
    const outcomes = (spec.tests || []).flatMap((test) =>
      (test.results || []).map((result) => result.status),
    );
    if (!outcomes.includes("passed")) {
      fail(`hosted smoke test did not pass: ${title}`);
    }
  }
  if ((report.stats?.unexpected || 0) !== 0) {
    fail("hosted smoke report contains unexpected failures");
  }
  return {
    requiredTests: REQUIRED_HOSTED_SMOKE_TESTS,
    expected: Number(
      report.stats?.expected || REQUIRED_HOSTED_SMOKE_TESTS.length,
    ),
    skipped: Number(report.stats?.skipped || 0),
    unexpected: Number(report.stats?.unexpected || 0),
    durationMs: Math.round(Number(report.stats?.duration || 0)),
    reportDigest: filePathDigest(path),
  };
}

function validatePerformanceEvidence(path, manifest) {
  const evidence = readJson(path);
  const endpointNames = new Set(
    (evidence.endpoints || []).map((endpoint) => endpoint.name),
  );
  if (
    evidence.schemaVersion !== 1 ||
    evidence.environment !== "staging" ||
    evidence.release !== manifest.commit ||
    evidence.result !== "PASS" ||
    evidence.scope !== "MARKET_SCOPED" ||
    !/^[A-Z]{2}$/.test(evidence.marketCode || "") ||
    !["liveness", "readiness", "marketplace_listings"].every((name) =>
      endpointNames.has(name),
    )
  ) {
    fail(
      "performance evidence is not a successful market-scoped staging record",
    );
  }
  return {
    result: evidence.result,
    marketCode: evidence.marketCode,
    verifiedAt: evidence.verifiedAt,
    budgets: evidence.budgets,
    endpoints: evidence.endpoints,
    reportDigest: filePathDigest(path),
  };
}

function filePathDigest(path) {
  return sha256(readFileSync(path));
}

function validateManifest(manifest, expectedRelease = "") {
  if (manifest.schemaVersion !== 1) fail("unsupported schemaVersion");
  assertSha(manifest.commit, "commit");
  if (expectedRelease && manifest.commit !== expectedRelease) {
    fail(
      `manifest commit ${manifest.commit} does not match ${expectedRelease}`,
    );
  }
  image(manifest.images?.frontend?.reference || "", "frontend image");
  image(manifest.images?.backend?.reference || "", "backend image");
  if (
    manifest.images.frontend.digest !==
    manifest.images.frontend.reference.split("@")[1]
  ) {
    fail("frontend digest and reference disagree");
  }
  if (
    manifest.images.backend.digest !==
    manifest.images.backend.reference.split("@")[1]
  ) {
    fail("backend digest and reference disagree");
  }
  for (const [name, digest] of [
    ["OpenAPI", manifest.openapiDigest],
    ["migration", manifest.migrationDigest],
  ]) {
    if (!/^sha256:[0-9a-f]{64}$/.test(digest || ""))
      fail(`${name} digest is invalid`);
  }
  if (!/^\d+_.+/.test(manifest.migrationRevision || "")) {
    fail("migration revision is invalid");
  }
  return manifest;
}

const [command, ...args] = process.argv.slice(2);

if (command === "create") {
  const [output, commit, repository, frontendReference, backendReference] =
    args;
  if (!output || !repository || !frontendReference || !backendReference) {
    fail("usage: create OUTPUT COMMIT REPOSITORY FRONTEND_IMAGE BACKEND_IMAGE");
  }
  assertSha(commit, "commit");
  const migrations = migrationState();
  const manifest = {
    schemaVersion: 1,
    release: `sha-${commit}`,
    commit,
    repository,
    builtAt: process.env.RELEASE_BUILT_AT || new Date().toISOString(),
    build: {
      workflow: process.env.GITHUB_WORKFLOW || "local",
      runId: process.env.GITHUB_RUN_ID || "local",
      runAttempt: process.env.GITHUB_RUN_ATTEMPT || "1",
    },
    images: {
      frontend: image(frontendReference, "frontend image"),
      backend: image(backendReference, "backend image"),
    },
    openapiDigest: fileDigest("backend/openapi/openapi.json"),
    migrationRevision: migrations.revision,
    migrationDigest: migrations.digest,
    supplyChain: {
      sbom: "OCI-attached BuildKit SBOM attestations",
      provenance: "OCI-attached BuildKit provenance attestations",
      scanner: "Trivy 0.73.0 (HIGH,CRITICAL)",
    },
  };
  validateManifest(manifest, commit);
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o644,
  });
  console.log(`Created ${output} for ${commit}.`);
} else if (command === "validate") {
  const [input, expectedRelease = ""] = args;
  if (!input) fail("usage: validate INPUT [EXPECTED_COMMIT]");
  validateManifest(readJson(input), expectedRelease);
  console.log(`Validated ${input}.`);
} else if (command === "certify") {
  const [manifestPath, output, hostedSmokeReportPath, performanceEvidencePath] =
    args;
  if (
    !manifestPath ||
    !output ||
    !hostedSmokeReportPath ||
    !performanceEvidencePath
  ) {
    fail(
      "usage: certify MANIFEST OUTPUT HOSTED_SMOKE_REPORT PERFORMANCE_EVIDENCE",
    );
  }
  const manifest = validateManifest(readJson(manifestPath));
  const hostedSmoke = validateHostedSmokeReport(hostedSmokeReportPath);
  const performance = validatePerformanceEvidence(
    performanceEvidencePath,
    manifest,
  );
  const certification = {
    schemaVersion: 1,
    environment: "staging",
    result: "passed",
    certifiedAt: new Date().toISOString(),
    commit: manifest.commit,
    images: manifest.images,
    openapiDigest: manifest.openapiDigest,
    migrationRevision: manifest.migrationRevision,
    migrationDigest: manifest.migrationDigest,
    checks: {
      hostedSmoke,
      performance,
    },
    workflow: {
      runId: process.env.GITHUB_RUN_ID || "local",
      runAttempt: process.env.GITHUB_RUN_ATTEMPT || "1",
    },
  };
  writeFileSync(output, `${JSON.stringify(certification, null, 2)}\n`, {
    mode: 0o644,
  });
  console.log(`Created ${output}.`);
} else if (command === "verify-certification") {
  const [manifestPath, certificationPath] = args;
  if (!manifestPath || !certificationPath) {
    fail("usage: verify-certification MANIFEST CERTIFICATION");
  }
  const manifest = validateManifest(readJson(manifestPath));
  const certification = readJson(certificationPath);
  if (
    certification.schemaVersion !== 1 ||
    certification.environment !== "staging" ||
    certification.result !== "passed"
  ) {
    fail("staging certification is not a successful supported record");
  }
  if (
    !certification.checks?.hostedSmoke ||
    certification.checks.hostedSmoke.unexpected !== 0 ||
    !REQUIRED_HOSTED_SMOKE_TESTS.every((title) =>
      certification.checks.hostedSmoke.requiredTests?.includes(title),
    )
  ) {
    fail("staging certification is missing the required hosted smoke evidence");
  }
  if (
    certification.checks?.performance?.result !== "PASS" ||
    !/^[A-Z]{2}$/.test(certification.checks.performance.marketCode || "")
  ) {
    fail("staging certification is missing successful performance evidence");
  }
  for (const field of [
    "commit",
    "openapiDigest",
    "migrationRevision",
    "migrationDigest",
  ]) {
    if (certification[field] !== manifest[field])
      fail(`certification ${field} does not match manifest`);
  }
  for (const name of ["frontend", "backend"]) {
    if (
      certification.images?.[name]?.reference !==
      manifest.images[name].reference
    ) {
      fail(`certification ${name} image is not the build-once digest`);
    }
  }
  console.log(
    `Certification proves ${manifest.commit} and both exact image digests passed staging.`,
  );
} else {
  fail("expected create, validate, certify, or verify-certification");
}
