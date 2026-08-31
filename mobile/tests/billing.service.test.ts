import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/config/environment", () => ({
  mobileEnvironment: { dataMode: "demo" },
}));

import { DemoMobileBillingService } from "@/features/billing/billing.service";

describe("DemoMobileBillingService", () => {
  it("returns exact catalog evidence for a professional billing projection", async () => {
    const service = new DemoMobileBillingService();
    const catalog = await service.getCatalog("FR");
    const overview = await service.getOverview("mobile_pro_test", "FR");

    expect(overview.currentSubscription).toMatchObject({
      configurationVersionId: catalog.configurationVersionId,
      marketCode: catalog.marketCode,
      currency: catalog.currency,
    });
    expect(overview.entitlements.length).toBeGreaterThan(0);
    expect(
      overview.entitlements.every(
        (entitlement) =>
          entitlement.configurationVersionId ===
            catalog.configurationVersionId &&
          Boolean(entitlement.productVersionId),
      ),
    ).toBe(true);
  });

  it("fails closed instead of copying France pricing into another market", async () => {
    const service = new DemoMobileBillingService();

    await expect(service.getCatalog("BE")).rejects.toThrow(
      "ne sont pas configurées",
    );
  });

  it("returns an empty billing projection for an individual account", async () => {
    const service = new DemoMobileBillingService();

    const overview = await service.getOverview("mobile_individual_test", "FR");
    expect(overview.currentSubscription).toBeUndefined();
    expect(overview.entitlements).toEqual([]);
  });
});
