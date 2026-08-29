import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DemoCrmRepository,
  DemoCrmShongreIntegrationRepository,
} from "../../src/infrastructure/database/repositories/index.js";
import { CrmShongreSyncWorker } from "../../src/workers/crm/crm-shongre-sync-worker.js";
import { CrmShongreService } from "../../src/modules/crm/crm-shongre.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const tenantId = "10000000-0000-4000-8000-000000000001";
const ownerUserId = "10000000-0000-4000-8000-000000000004";
const principal: Principal = {
  userId: ownerUserId,
  email: "owner@example.test",
  role: "buyer",
  accountType: "individual",
  staffStatus: "active",
  staffRole: "admin",
  mfaVerified: true,
};

describe("CrmShongreSyncWorker", () => {
  it("deduplicates the envelope and applies it once", async () => {
    const integration = new DemoCrmShongreIntegrationRepository();
    const eventId = randomUUID();
    const input = {
      tenantId,
      eventId,
      eventType: "professional.created" as const,
      occurredAt: new Date().toISOString(),
      idempotencyKey: "organization:demo:created",
      payload: { organizationId: randomUUID(), ownerUserId },
    };
    const firstId = await integration.enqueue(input);
    await expect(integration.enqueue(input)).resolves.toBe(firstId);

    const worker = new CrmShongreSyncWorker(
      integration,
      new DemoCrmRepository(),
      "crm-sync-test",
    );
    await expect(worker.run()).resolves.toEqual({
      claimed: 1,
      succeeded: 1,
      retried: 0,
      deadLettered: 0,
    });
    expect(integration.hasApplied(eventId)).toBe(true);
    await expect(worker.run()).resolves.toMatchObject({ claimed: 0 });
  });

  it("dead-letters an unsupported projection without retrying forever", async () => {
    const integration = new DemoCrmShongreIntegrationRepository();
    await integration.enqueue({
      tenantId,
      eventType: "listing.published",
      occurredAt: new Date().toISOString(),
      idempotencyKey: "listing:demo:published",
      payload: { listingId: randomUUID(), ownerUserId },
    });
    const worker = new CrmShongreSyncWorker(
      integration,
      new DemoCrmRepository(),
      "crm-sync-invalid-test",
    );
    await expect(worker.run()).resolves.toEqual({
      claimed: 1,
      succeeded: 0,
      retried: 0,
      deadLettered: 1,
    });
    await expect(worker.run()).resolves.toMatchObject({ claimed: 0 });
  });

  it("returns an explicit linked or not-linked intelligence state", async () => {
    const service = new CrmShongreService(
      new DemoCrmRepository(),
      new DemoCrmShongreIntegrationRepository(),
    );
    await expect(
      service.accountIntelligence(
        principal,
        "20000000-0000-4000-8000-000000000001",
      ),
    ).resolves.toMatchObject({
      linked: true,
      listings: { published: 28 },
      subscription: { status: "active" },
    });
    await expect(
      service.accountIntelligence(
        principal,
        "20000000-0000-4000-8000-000000000002",
      ),
    ).resolves.toMatchObject({
      linked: false,
      professional: { availability: "not_linked" },
    });
  });
});
