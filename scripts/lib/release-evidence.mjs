export const PERFORMANCE_EVIDENCE_VERSION = 2;
export const REQUIRED_HOSTED_SMOKE_TESTS = [
  "serves the international gateway with environment-safe headers",
  "serves the France marketplace with environment-safe headers",
  "serves each canonical Shongre application hostname",
  "serves live and ready API probes through the Tunnel",
  "returns a market-scoped public listings feed",
  "authenticates, refreshes, mutates and logs out on both marketplace origins",
  "isolates favorites by account and market",
  "publishes a listing and enforces conversation ownership",
  "creates an invoice idempotently and denies another tenant",
  "creates a sandbox checkout and processes an authorized refund",
];
export const REQUIRED_PERFORMANCE_ENDPOINTS = [
  "liveness",
  "readiness",
  "marketplace_listings",
  "marketplace_search",
  "marketplace_search_post_fallback",
];

export function validatePerformanceEvidence(evidence, release) {
  const endpoints = Array.isArray(evidence.endpoints) ? evidence.endpoints : [];
  const names = new Set(endpoints.map((endpoint) => endpoint.name));
  const configuration = evidence.configuration || {};
  const conditionalCache = evidence.conditionalCache || {};
  if (
    evidence.schemaVersion !== PERFORMANCE_EVIDENCE_VERSION ||
    evidence.environment !== "staging" ||
    evidence.release !== release ||
    evidence.result !== "PASS" ||
    evidence.scope !== "MARKET_SCOPED" ||
    !/^[A-Z]{2}$/.test(evidence.marketCode || "") ||
    !Number.isFinite(Date.parse(evidence.verifiedAt || "")) ||
    !Number.isSafeInteger(configuration.requestCount) ||
    configuration.requestCount <= 0 ||
    !Number.isSafeInteger(configuration.concurrency) ||
    configuration.concurrency <= 0 ||
    configuration.concurrency > configuration.requestCount ||
    !Number.isSafeInteger(configuration.timeoutMs) ||
    configuration.timeoutMs <= 0 ||
    !REQUIRED_PERFORMANCE_ENDPOINTS.every((name) => names.has(name)) ||
    conditionalCache.result !== "PASS" ||
    conditionalCache.shared?.result !== "PASS" ||
    conditionalCache.shared?.etag !== true ||
    conditionalCache.shared?.conditionalStatus !== 304 ||
    conditionalCache.revalidate?.result !== "PASS" ||
    conditionalCache.revalidate?.etag !== true ||
    conditionalCache.revalidate?.conditionalStatus !== 304 ||
    !Number.isFinite(evidence.budgets?.p95Ms) ||
    evidence.budgets.p95Ms <= 0 ||
    !Number.isFinite(evidence.budgets?.minimumSuccessRate) ||
    evidence.budgets.minimumSuccessRate <= 0 ||
    evidence.budgets.minimumSuccessRate > 1 ||
    endpoints.some(
      (endpoint) =>
        !Number.isSafeInteger(endpoint.requests) ||
        endpoint.requests !== configuration.requestCount ||
        !Number.isSafeInteger(endpoint.validResponses) ||
        endpoint.validResponses < 0 ||
        endpoint.validResponses > endpoint.requests ||
        !Number.isFinite(endpoint.p95Ms) ||
        endpoint.p95Ms < 0 ||
        endpoint.p95Ms > evidence.budgets.p95Ms ||
        !Number.isFinite(endpoint.p50Ms) ||
        endpoint.p50Ms < 0 ||
        endpoint.p50Ms > endpoint.p95Ms ||
        !Number.isFinite(endpoint.p99Ms) ||
        endpoint.p99Ms < endpoint.p95Ms ||
        !Number.isFinite(endpoint.successRate) ||
        endpoint.successRate < evidence.budgets.minimumSuccessRate ||
        endpoint.successRate > 1 ||
        Math.abs(
          endpoint.successRate - endpoint.validResponses / endpoint.requests,
        ) > Number.EPSILON ||
        !endpoint.statuses ||
        Object.values(endpoint.statuses).some(
          (count) => !Number.isSafeInteger(count) || count < 0,
        ) ||
        Object.values(endpoint.statuses).reduce(
          (total, count) => total + count,
          0,
        ) !== endpoint.requests,
    )
  )
    throw new Error(
      "performance evidence is not a successful market-scoped staging record",
    );
  return evidence;
}

function isDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(value || "");
}

function isImmutableImage(image) {
  if (!image || typeof image.reference !== "string" || !isDigest(image.digest))
    return false;
  const separator = image.reference.lastIndexOf("@");
  return (
    separator > 0 &&
    image.reference.slice(separator + 1) === image.digest &&
    !/\s/.test(image.reference)
  );
}

export function validateStagingCertificationEvidence(evidence, release) {
  const hostedSmoke = evidence.checks?.hostedSmoke;
  if (
    evidence.schemaVersion !== 1 ||
    evidence.environment !== "staging" ||
    evidence.result !== "passed" ||
    evidence.commit !== release ||
    !Number.isFinite(Date.parse(evidence.certifiedAt || "")) ||
    !isImmutableImage(evidence.images?.frontend) ||
    !isImmutableImage(evidence.images?.backend) ||
    !isDigest(evidence.openapiDigest) ||
    !/^\d+_.+/.test(evidence.migrationRevision || "") ||
    !isDigest(evidence.migrationDigest) ||
    !hostedSmoke ||
    !Array.isArray(hostedSmoke.requiredTests) ||
    hostedSmoke.unexpected !== 0 ||
    hostedSmoke.skipped !== 0 ||
    hostedSmoke.flaky !== 0 ||
    !Number.isSafeInteger(hostedSmoke.expected) ||
    hostedSmoke.expected < REQUIRED_HOSTED_SMOKE_TESTS.length ||
    !Number.isFinite(hostedSmoke.durationMs) ||
    hostedSmoke.durationMs < 0 ||
    !isDigest(hostedSmoke.reportDigest) ||
    !REQUIRED_HOSTED_SMOKE_TESTS.every((title) =>
      hostedSmoke.requiredTests?.includes(title),
    )
  ) {
    throw new Error(
      "staging certification is not a complete successful record for RELEASE_SHA",
    );
  }
  validatePerformanceEvidence(evidence.checks?.performance || {}, release);
  if (!isDigest(evidence.checks.performance.reportDigest)) {
    throw new Error(
      "staging performance evidence is missing its report digest",
    );
  }
  return evidence;
}
