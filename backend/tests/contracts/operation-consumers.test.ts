import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

/**
 * Every business operation should have a client that calls it, or an explicit
 * reason why it does not.
 *
 * Neither state was visible before: an operation could be added and never wired
 * up, or lose its last consumer during a migration, and nothing failed. The
 * allowlist below turns that drift into a decision — a new unconsumed operation
 * fails this test until someone records why it exists.
 *
 * Server-to-server surfaces are excluded by shape rather than by name: health,
 * readiness, documentation, provider webhooks and browser-redirect OAuth
 * callbacks are never called from client code by design.
 */

/** Reason recorded per operation. Removing a reason removes the exemption. */
const UNCONSUMED_BY_DESIGN: Record<string, string> = {
  postAnalyticsEvents:
    "Called through the analytics transport, which builds its request from @shongre/contracts/analytics rather than the generated operation table.",
  emitMarketingJourneyEvent:
    "Server-to-server journey ingestion from the marketing worker, not a client surface.",
  recordMarketingClick:
    "Tracking pixel/redirect endpoint opened by an email client, never by application code.",
  recordMarketingOpen:
    "Tracking pixel endpoint opened by an email client, never by application code.",
  getAuthSessions:
    "Session listing has no UI yet; kept because account-security screens are specified against it.",
};

/**
 * Operations with no client consumer and no recorded reason. Each is either a
 * missing surface or a contract to sunset; both need a decision, and neither is
 * urgent enough to block the gate today. Shrinking this list is the goal —
 * growing it requires deliberately editing this file.
 */
const AWAITING_DECISION = [
  "getAdminComplianceUsersByUserIdStatus",
  "getAdminDeliveryRequests",
  "getRealEstatePropertiesByIdDocumentsByDocumentIdAccess",
  "postAdminComplianceRetentionRun",
  "postAdminComplianceUsersByUserIdRequirements",
  "postAdminDiscoveryExplain",
  "postAutoVehicles",
  "postBusinessRulesEligibility",
  "postEducationBookings",
  "postMessagingOffersIdCounter",
  "postMonetizationTrials",
  "postOrdersByIdRefund",
  "postPublicationEntitlements",
];

const SERVER_TO_SERVER =
  /health|readiness|liveness|openapi|documentation|webhook|callback|dataDeletion/i;

function specificationOperationIds(): string[] {
  const ids: string[] = [];
  for (const path of Object.keys(specification.paths)) {
    for (const method of Object.keys(specification.paths[path])) {
      const operationId = specification.paths[path][method]?.operationId;
      if (operationId) ids.push(operationId);
    }
  }
  return ids;
}

function clientReferencedIdentifiers(): Set<string> {
  // Both clients name operations as string literals: the Web adapters through
  // `apiOperation<…, "id">` generics, mobile through `apiOperation("id")`.
  const output = execSync(
    `grep -rhoE '"[a-z][A-Za-z0-9_]{3,}"' ` +
      `frontend/src/api/adapters/http frontend/src/platform mobile/src mobile/app 2>/dev/null || true`,
    { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return new Set(output.split("\n").map((line) => line.replace(/"/g, "")));
}

describe("generated operation consumers", () => {
  const referenced = clientReferencedIdentifiers();
  const businessOperations = specificationOperationIds().filter(
    (id) => !SERVER_TO_SERVER.test(id),
  );

  it("reads the contract and the client sources it is checking", () => {
    expect(businessOperations.length).toBeGreaterThan(400);
    expect(referenced.size).toBeGreaterThan(100);
  });

  it("has a client consumer or a recorded reason for every operation", () => {
    const unexplained = businessOperations.filter(
      (id) =>
        !referenced.has(id) &&
        !UNCONSUMED_BY_DESIGN[id] &&
        !AWAITING_DECISION.includes(id),
    );
    expect(
      unexplained,
      `these operations have no client consumer and no recorded reason.\n` +
        `Wire a client, or add the operation to UNCONSUMED_BY_DESIGN with why:\n${unexplained.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps both exemption lists honest", () => {
    const stale = [
      ...Object.keys(UNCONSUMED_BY_DESIGN),
      ...AWAITING_DECISION,
    ].filter((id) => !businessOperations.includes(id));
    expect(
      stale,
      `these are exempted but no longer exist in the contract:\n${stale.join("\n")}`,
    ).toEqual([]);

    const nowConsumed = AWAITING_DECISION.filter((id) => referenced.has(id));
    expect(
      nowConsumed,
      `these now have a consumer and should leave AWAITING_DECISION:\n${nowConsumed.join("\n")}`,
    ).toEqual([]);
  });

  it("does not let the undecided list grow silently", () => {
    // A ratchet, not a target: this number may fall, never rise.
    expect(AWAITING_DECISION.length).toBeLessThanOrEqual(13);
  });
});
