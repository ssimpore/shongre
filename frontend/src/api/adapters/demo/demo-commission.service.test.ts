import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DemoCommissionService } from "./demo-commission.service";
import { storageService } from "../../../services/storage.service";

const input = {
  eligibleCommercialEvent: true,
  earningEvent: "payment_succeeded" as const,
  effectiveAt: "2026-08-24T12:00:00.000Z",
  marketCode: "FR" as const,
  countryCode: "FR",
  currency: "EUR",
  transactionType: "marketplace_order" as const,
  sellerType: "professional" as const,
  campaignIds: [],
  itemSubtotalMinor: 20_000,
  discountMinor: 0,
  shippingMinor: 0,
  taxMinor: 0,
  buyerFeesMinor: 0,
  totalMinor: 20_000,
  platformCollectedMinor: 20_000,
  historicalVolumeMinor: 0,
};

describe("DemoCommissionService", () => {
  beforeEach(() => storageService.setCurrentUserKey("super_admin_alex"));
  afterEach(() => storageService.setCurrentUserKey("guest"));

  it("returns the same server-shaped deterministic preview", async () => {
    const service = new DemoCommissionService();
    const first = await service.preview(input);
    const second = await service.preview(input);
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      state: "quoted",
      totalCommissionMinor: 600,
      sellerPayableMinor: 19_400,
      appliedPolicyId: "commission-policy-marketplace-pro-fr",
    });
  });

  it("uses the safe zero default for individual sellers", async () => {
    const result = await new DemoCommissionService().preview({
      ...input,
      sellerType: "individual",
    });
    expect(result).toMatchObject({
      eligible: false,
      totalCommissionMinor: 0,
      reasonCode: "NO_ACTIVE_ELIGIBLE_POLICY",
    });
  });

  it.each([
    ["CHF", 4_568_400],
    ["XOF", 3_187_951_020],
  ])(
    "returns deterministic %s reporting analytics instead of an empty result",
    async (currency, expectedGmvMinor) => {
      const rows = await new DemoCommissionService().getAnalytics({
        from: "2026-08-01",
        to: "2026-08-31",
        marketCode: "ALL",
        currency,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        currency,
        gmvMinor: expectedGmvMinor,
        transactionCount: 184,
      });
      expect(rows[0].commissionRevenueMinor).toBeGreaterThan(
        rows[0].commissionRefundMinor,
      );
    },
  );
});
