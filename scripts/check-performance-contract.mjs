#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SHONGRE_PERFORMANCE_BUDGETS,
  SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS,
} from "@shongre/contracts/performance";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const requireText = (path, pattern, message) => {
  if (!pattern.test(read(path))) failures.push(`${path}: ${message}`);
};
const rejectText = (path, pattern, message) => {
  if (pattern.test(read(path))) failures.push(`${path}: ${message}`);
};

requireText(
  "frontend/src/configuration/query.config.ts",
  /SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS/,
  "React Query must consume the shared performance contract",
);
requireText(
  "frontend/scripts/check-client-bundle-budget.mjs",
  /SHONGRE_PERFORMANCE_BUDGETS\.clientBundle/,
  "bundle budgets must come from the shared performance contract",
);
requireText(
  "scripts/load-smoke.mjs",
  /SHONGRE_PERFORMANCE_BUDGETS\.api/,
  "load thresholds must come from the shared performance contract",
);
requireText(
  "backend/src/api/v1/router.ts",
  /writeJsonResponse/,
  "API responses must pass through the centralized cache/ETag policy",
);
requireText(
  "backend/src/infrastructure/database/repositories/listing.repository.ts",
  /LISTING_PROJECTION/,
  "the hot listing query must use an explicit projection",
);
requireText(
  "backend/src/infrastructure/queue/provider-webhook-inbox.ts",
  /config\.performance\.providerWebhook/,
  "provider webhook queue limits must come from validated configuration",
);
rejectText(
  "backend/src/infrastructure/database/repositories/listing.repository.ts",
  /`\*,\s*listing_media/,
  "the hot listing query must not regress to a wildcard projection",
);

for (const path of [
  "backend/src/integrations/providers/payment.provider.ts",
  "backend/src/integrations/providers/kyc.provider.ts",
  "backend/src/integrations/providers/payment-compliance.provider.ts",
  "backend/src/integrations/providers/ai.provider.ts",
  "backend/src/integrations/providers/business-registry.provider.ts",
  "backend/src/integrations/providers/gateways/remote-capability-gateways.ts",
  "backend/src/infrastructure/payments/stripe-checkout-adapter.ts",
]) {
  rejectText(
    path,
    /AbortSignal\.timeout\(\s*[0-9][0-9_]*/,
    "provider timeouts must come from validated configuration",
  );
}

const migrationCorpus =
  read("backend/supabase/migrations/00018_unified_catalog_discovery.sql") +
  read("backend/supabase/migrations/00063_listing_market_publications.sql");
for (const indexName of [
  "listings_organic_discovery_idx",
  "listing_market_discovery_idx",
  "listing_market_currency_price_idx",
]) {
  if (!migrationCorpus.includes(indexName)) {
    failures.push(`required query-driven index is missing: ${indexName}`);
  }
}

if (
  SHONGRE_PERFORMANCE_BUDGETS.database.interactiveQueryP95Ms >=
  SHONGRE_PERFORMANCE_BUDGETS.api.p95Ms
) {
  failures.push(
    "database query budget must leave time for application and network work",
  );
}
if (
  SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.discoveryCandidateLimit > 500
) {
  failures.push(
    "discovery candidate retrieval is no longer bounded by the repository limit",
  );
}

if (failures.length > 0) {
  console.error(
    `Performance contract check failed:\n- ${failures.join("\n- ")}`,
  );
  process.exit(1);
}

console.log(
  `Performance contract is centralized: API p95 ${SHONGRE_PERFORMANCE_BUDGETS.api.p95Ms} ms, DB p95 ${SHONGRE_PERFORMANCE_BUDGETS.database.interactiveQueryP95Ms} ms, discovery cap ${SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.discoveryCandidateLimit}.`,
);
