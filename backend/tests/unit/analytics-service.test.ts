import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import { config } from "../../src/app/config/index.js";
import {
  GUEST_PRINCIPAL,
  type Principal,
} from "../../src/shared/auth/principal.js";
import { AnalyticsService } from "../../src/modules/analytics/analytics.service.js";
import { DemoAnalyticsRepository } from "../../src/modules/analytics/analytics.repository.js";

class CapturingRepository extends DemoAnalyticsRepository {
  captured: AnalyticsEventEnvelope[] = [];
  queued: Array<{ eventId: string; providers: readonly string[] }> = [];
  override async append(
    events: readonly AnalyticsEventEnvelope[],
  ): Promise<void> {
    this.captured.push(...events);
  }
  override async enqueueDeliveries(
    eventId: string,
    providers: ReadonlyArray<"posthog" | "ga4" | "matomo">,
  ): Promise<void> {
    this.queued.push({ eventId, providers });
  }
}

const authenticated: Principal = {
  userId: "account-authoritative",
  email: "person@example.com",
  role: "individual",
  accountType: "individual",
  status: "active",
};

function event(overrides: Partial<AnalyticsEventEnvelope["context"]> = {}) {
  return {
    name: "page_viewed",
    context: {
      eventId: "evt_test_123456",
      timestamp: new Date().toISOString(),
      schemaVersion: 1,
      environment: "production",
      platform: "web",
      countryCode: "FR",
      marketCode: "FR",
      locale: "fr-FR",
      currency: "EUR",
      userId: "caller-supplied-user",
      ...overrides,
    },
    properties: {
      path: "/annonces?email=person@example.com",
      email: "person@example.com",
      listingId: "listing-1",
    },
  };
}

describe("AnalyticsService", () => {
  const originalMode = config.analyticsMode;

  beforeEach(() => {
    config.analyticsMode = "test";
  });

  afterEach(() => {
    config.analyticsMode = originalMode;
  });

  it("uses authenticated server identity and removes sensitive properties", async () => {
    const repository = new CapturingRepository();
    const service = new AnalyticsService(repository);
    await service.ingest({ events: [event()] }, authenticated, {
      requestId: "request-1",
      marketCode: "FR",
      userAgent: "Mozilla/5.0",
      rateLimitKey: "analytics-test-authenticated",
    });
    expect(repository.captured[0]?.context).toMatchObject({
      userId: "account-authoritative",
      requestId: "request-1",
      isTestTraffic: true,
    });
    expect(repository.captured[0]?.properties).toEqual({
      path: "/annonces",
      listingId: "listing-1",
    });
  });

  it("never accepts a caller-supplied user identity for a guest", async () => {
    const repository = new CapturingRepository();
    const service = new AnalyticsService(repository);
    await service.ingest({ events: [event()] }, GUEST_PRINCIPAL, {
      requestId: "request-2",
      marketCode: "FR",
      rateLimitKey: "analytics-test-guest",
    });
    expect(repository.captured[0]?.context.userId).toBeUndefined();
    expect(repository.captured[0]?.context.userType).toBeUndefined();
  });

  it("rejects events whose country or market conflicts with request context", async () => {
    const service = new AnalyticsService(new CapturingRepository());
    await expect(
      service.ingest(
        { events: [event({ countryCode: "BE", marketCode: "BE" })] },
        GUEST_PRINCIPAL,
        {
          requestId: "request-3",
          marketCode: "FR",
          rateLimitKey: "analytics-test-conflict",
        },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("builds authoritative events from the canonical market configuration", async () => {
    const repository = new CapturingRepository();
    const service = new AnalyticsService(repository);
    await service.captureAuthoritative({
      name: "transaction_completed",
      marketCode: "CH",
      eventId: "evt_transaction_pi_analytics_test",
      properties: { amountMinor: 12_500, currency: "CHF" },
    });
    expect(repository.captured[0]?.context).toMatchObject({
      eventId: "evt_transaction_pi_analytics_test",
      platform: "backend",
      countryCode: "CH",
      marketCode: "CH",
      currency: "CHF",
    });
    expect(repository.queued).toEqual([
      {
        eventId: repository.captured[0]?.context.eventId,
        providers: [],
      },
    ]);
  });
});
