import { describe, expect, it } from "vitest";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { DemoCommissionRepository } from "../../src/infrastructure/database/repositories/commission.repository.js";
import { CommissionService } from "../../src/modules/commission/commission.service.js";

const commercialRules = {
  async getCatalog() {
    return structuredClone(BASELINE_MONETIZATION_CATALOG);
  },
};

function request(suffix: string) {
  return {
    idempotencyKey: `commission-test-${suffix}`,
    transactionId: `transaction-${suffix}`,
    orderId: `order-${suffix}`,
    eligibleCommercialEvent: true,
    earningEvent: "payment_succeeded" as const,
    effectiveAt: "2026-08-24T12:00:00.000Z",
    marketCode: "FR" as const,
    countryCode: "FR",
    currency: "EUR",
    transactionType: "marketplace_order" as const,
    sellerType: "professional" as const,
    sellerAccountId: `seller-${suffix}`,
    campaignIds: [],
    itemSubtotalMinor: 10_000,
    discountMinor: 0,
    shippingMinor: 500,
    taxMinor: 0,
    buyerFeesMinor: 470,
    totalMinor: 10_970,
    platformCollectedMinor: 10_970,
    historicalVolumeMinor: 0,
  };
}

describe("CommissionService", () => {
  it("uses the active catalogue policy and stores an immutable earning snapshot", async () => {
    const service = new CommissionService(
      new DemoCommissionRepository(),
      commercialRules,
    );
    const calculation = await service.record(request("record-01"));
    expect(calculation).toMatchObject({
      state: "earned",
      eligible: true,
      totalCommissionMinor: 300,
      sellerChargeMinor: 300,
      sellerPayableMinor: 9_700,
      appliedPolicyId: "commission-policy-marketplace-pro-fr",
      appliedRuleId: "commission-rule-marketplace-pro-fr",
    });
    expect(await service.getCalculation(calculation.id)).toEqual(calculation);
  });

  it("is idempotent and never charges an individual without an active policy", async () => {
    const repository = new DemoCommissionRepository();
    const service = new CommissionService(repository, commercialRules);
    const input = {
      ...request("idempotent-02"),
      sellerType: "individual" as const,
    };
    const first = await service.record(input);
    const second = await service.record({
      ...input,
      itemSubtotalMinor: 99_999,
    });
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      eligible: false,
      reasonCode: "NO_ACTIVE_ELIGIBLE_POLICY",
      totalCommissionMinor: 0,
    });
  });

  it("previews without persisting and reverses a partial refund from history", async () => {
    const service = new CommissionService(
      new DemoCommissionRepository(),
      commercialRules,
    );
    const preview = await service.preview(request("preview-03"));
    expect(preview.state).toBe("quoted");
    await expect(service.getCalculation(preview.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const calculation = await service.record(request("refund-03"));
    const reversal = await service.reverse(calculation.id, {
      refundBaseMinor: 4_000,
      idempotencyKey: "commission-refund-03",
      occurredAt: "2026-08-25T12:00:00.000Z",
    });
    expect(reversal).toMatchObject({
      state: "partially_reversed",
      reversedCommissionMinor: 120,
      sellerCreditMinor: 120,
    });
  });

  it("reports GMV separately from net commission revenue and refunds", async () => {
    const service = new CommissionService(
      new DemoCommissionRepository(),
      commercialRules,
    );
    const calculation = await service.record(request("analytics-04"));
    await service.reverse(calculation.id, {
      refundBaseMinor: 5_000,
      idempotencyKey: "commission-refund-analytics-04",
      occurredAt: "2026-08-25T12:00:00.000Z",
    });
    const rows = await service.listAnalytics({
      marketCode: "FR",
      currency: "EUR",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(rows).toContainEqual(
      expect.objectContaining({
        gmvMinor: 10_000,
        grossCommissionMinor: 300,
        commissionRevenueMinor: 250,
        commissionRefundMinor: 125,
        effectiveTakeRateBps: 125,
      }),
    );
  });

  it("locks a checkout quote without recognizing revenue until payment", async () => {
    const service = new CommissionService(
      new DemoCommissionRepository(),
      commercialRules,
    );
    const quoted = await service.quote(request("quote-earned-05"));
    expect(quoted.state).toBe("quoted");
    await expect(
      service.listAnalytics({
        marketCode: "FR",
        currency: "EUR",
        from: "2026-08-01",
        to: "2026-08-31",
      }),
    ).resolves.toEqual([]);

    const earned = await service.earnQuote(quoted.id, {
      transactionId: "transaction-quote-earned-05",
      idempotencyKey: "commission-earned-quote-earned-05",
      effectiveAt: "2026-08-25T12:00:00.000Z",
    });
    expect(earned).toMatchObject({
      state: "earned",
      totalCommissionMinor: quoted.totalCommissionMinor,
      sellerPayableMinor: quoted.sellerPayableMinor,
    });
    await expect(
      service.earnQuote(quoted.id, {
        transactionId: "transaction-quote-earned-05",
        idempotencyKey: "commission-earned-quote-earned-05",
        effectiveAt: "2026-08-26T12:00:00.000Z",
      }),
    ).resolves.toEqual(earned);
    const rows = await service.listAnalytics({
      marketCode: "FR",
      currency: "EUR",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ transactionCount: 1, gmvMinor: 10_000 });
  });

  it("keeps retries idempotent and rejects cumulative over-refunds", async () => {
    const service = new CommissionService(
      new DemoCommissionRepository(),
      commercialRules,
    );
    const calculation = await service.record(request("refund-cap-05"));
    const first = await service.reverse(calculation.id, {
      refundBaseMinor: 6_000,
      idempotencyKey: "commission-refund-cap-05-a",
      occurredAt: "2026-08-25T12:00:00.000Z",
    });
    await expect(
      service.reverse(calculation.id, {
        refundBaseMinor: 6_000,
        idempotencyKey: "commission-refund-cap-05-a",
        occurredAt: "2026-08-26T12:00:00.000Z",
      }),
    ).resolves.toEqual(first);
    await expect(
      service.reverse(calculation.id, {
        refundBaseMinor: 4_001,
        idempotencyKey: "commission-refund-cap-05-b",
        occurredAt: "2026-08-26T12:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { remainingBaseMinor: 4_000 },
    });
    await expect(
      service.reverse(calculation.id, {
        refundBaseMinor: 4_000,
        idempotencyKey: "commission-refund-cap-05-c",
        occurredAt: "2026-08-27T12:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      state: "reversed",
      reversedBaseMinor: 4_000,
      reversedCommissionMinor: 120,
    });
    await expect(
      service.reverse(calculation.id, {
        refundBaseMinor: 1,
        idempotencyKey: "commission-refund-cap-05-d",
        occurredAt: "2026-08-28T12:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { remainingBaseMinor: 0 },
    });
  });
});
