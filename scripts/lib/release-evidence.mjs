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
  const endpoints = evidence.endpoints || [];
  const names = new Set(endpoints.map((endpoint) => endpoint.name));
  if (
    evidence.schemaVersion !== PERFORMANCE_EVIDENCE_VERSION ||
    evidence.environment !== "staging" ||
    evidence.release !== release ||
    evidence.result !== "PASS" ||
    evidence.scope !== "MARKET_SCOPED" ||
    !/^[A-Z]{2}$/.test(evidence.marketCode || "") ||
    !REQUIRED_PERFORMANCE_ENDPOINTS.every((name) => names.has(name)) ||
    evidence.conditionalCache?.result !== "PASS" ||
    !Number.isFinite(evidence.budgets?.p95Ms) ||
    evidence.budgets.p95Ms <= 0 ||
    !Number.isFinite(evidence.budgets?.minimumSuccessRate) ||
    evidence.budgets.minimumSuccessRate <= 0 ||
    evidence.budgets.minimumSuccessRate > 1 ||
    endpoints.some(
      (endpoint) =>
        !Number.isFinite(endpoint.p95Ms) ||
        endpoint.p95Ms < 0 ||
        endpoint.p95Ms > evidence.budgets.p95Ms ||
        !Number.isFinite(endpoint.successRate) ||
        endpoint.successRate < evidence.budgets.minimumSuccessRate ||
        endpoint.successRate > 1,
    )
  )
    throw new Error(
      "performance evidence is not a successful market-scoped staging record",
    );
  return evidence;
}
