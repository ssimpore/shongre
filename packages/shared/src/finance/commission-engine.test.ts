import { describe, expect, it } from "vitest";
import type {
  CommissionCalculationInput,
  CommissionEffect,
  CommissionPolicy,
  CommissionScope,
} from "@shongre/contracts/monetization";
import {
  calculateCommission,
  calculateCommissionReversal,
} from "./commission-engine";

const emptyScope: CommissionScope = {
  countryCodes: [],
  marketCodes: [],
  currencies: [],
  verticalIds: [],
  categoryIds: [],
  subcategoryIds: [],
  transactionTypes: [],
  sellerTypes: [],
  sellerSegments: [],
  planIds: [],
  organizationIds: [],
  accountIds: [],
  campaignIds: [],
  paymentMethods: [],
};

const defaultEffect: CommissionEffect = {
  kind: "commission",
  base: "item_subtotal",
  model: { type: "percentage", rateBps: 500 },
  allocation: { sellerBps: 10_000, buyerBps: 0, platformAbsorbedBps: 0 },
  tax: { mode: "exempt", rateBps: 0 },
  roundingMode: "half_up",
  earningEvent: "payment_succeeded",
  refundPolicy: "proportional",
};

function policy(
  id: string,
  scope: Partial<CommissionScope> = {},
  effect: CommissionEffect = defaultEffect,
  priority = 0,
): CommissionPolicy {
  return {
    id,
    code: id,
    versionId: "commercial-fr-v3",
    versionNumber: 3,
    name: id,
    description: id,
    policyType: effect.kind === "commission" ? "base" : "adjustment",
    status: "active",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    rolloutBps: 10_000,
    rules: [
      {
        id: `${id}.rule`,
        policyId: id,
        versionId: "commercial-fr-v3",
        name: `${id}.rule`,
        description: id,
        priority,
        scope: { ...emptyScope, ...scope },
        effect,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

const input: CommissionCalculationInput = {
  eligibleCommercialEvent: true,
  earningEvent: "payment_succeeded",
  effectiveAt: "2026-08-24T12:00:00.000Z",
  marketCode: "FR",
  countryCode: "FR",
  currency: "EUR",
  verticalId: "cours",
  categoryId: "courses",
  subcategoryId: "languages",
  transactionType: "marketplace_order",
  sellerType: "professional",
  sellerSegment: "standard",
  sellerAccountId: "seller-1",
  organizationId: "org-1",
  planId: "plan.pro.business",
  campaignIds: [],
  itemSubtotalMinor: 10_000,
  discountMinor: 0,
  shippingMinor: 500,
  taxMinor: 0,
  buyerFeesMinor: 0,
  totalMinor: 10_500,
  platformCollectedMinor: 10_500,
  historicalVolumeMinor: 0,
};

function calculate(policies: CommissionPolicy[], override = {}) {
  return calculateCommission({
    configurationVersionId: "commercial-fr-v3",
    policies,
    input: { ...input, ...override },
    calculatedAt: "2026-08-24T12:00:01.000Z",
  });
}

describe("commission engine", () => {
  it("defaults safely to zero when no active eligible policy exists", () => {
    const result = calculate([]);
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("NO_ACTIVE_ELIGIBLE_POLICY");
    expect(result.totalCommissionMinor).toBe(0);
    expect(result.sellerPayableMinor).toBe(10_000);
  });

  it("never charges for a listing or other non-eligible commercial event", () => {
    const result = calculate([policy("global")], {
      eligibleCommercialEvent: false,
    });
    expect(result.reasonCode).toBe("COMMERCIAL_EVENT_NOT_ELIGIBLE");
    expect(result.totalCommissionMinor).toBe(0);
  });

  it("waits for the policy earning event", () => {
    const result = calculate([policy("global")], {
      earningEvent: "order_completed",
    });
    expect(result.reasonCode).toBe("EARNING_EVENT_NOT_REACHED");
    expect(result.totalCommissionMinor).toBe(0);
  });

  it("resolves organization, plan, taxonomy, vertical and country deterministically", () => {
    const policies = [
      policy(
        "global",
        {},
        { ...defaultEffect, model: { type: "percentage", rateBps: 500 } },
      ),
      policy(
        "country",
        { countryCodes: ["FR"] },
        { ...defaultEffect, model: { type: "percentage", rateBps: 450 } },
      ),
      // A canonical Education policy must keep matching immutable legacy input.
      policy(
        "vertical",
        { verticalIds: ["education"] },
        { ...defaultEffect, model: { type: "percentage", rateBps: 800 } },
      ),
      policy(
        "category",
        { categoryIds: ["courses"] },
        { ...defaultEffect, model: { type: "percentage", rateBps: 700 } },
      ),
      policy(
        "plan",
        { planIds: ["plan.pro.business"] },
        { ...defaultEffect, model: { type: "percentage", rateBps: 250 } },
      ),
      policy(
        "organization",
        { organizationIds: ["org-1"] },
        { ...defaultEffect, model: { type: "percentage", rateBps: 150 } },
      ),
    ];
    const result = calculate(policies);
    expect(result.appliedPolicyId).toBe("organization");
    expect(result.totalCommissionMinor).toBe(150);
    expect(
      result.explanation.find((entry) => entry.policyId === "organization"),
    ).toMatchObject({
      matched: true,
      precedence: 900_000,
    });
  });

  it("uses priority and stable IDs only inside the same precedence level", () => {
    const result = calculate([
      policy("category-low", { categoryIds: ["courses"] }, defaultEffect, 10),
      policy(
        "category-high",
        { categoryIds: ["courses"] },
        { ...defaultEffect, model: { type: "fixed", fixedMinor: 321 } },
        20,
      ),
    ]);
    expect(result.appliedPolicyId).toBe("category-high");
    expect(result.totalCommissionMinor).toBe(321);
  });

  it("supports percentage, fixed, combined, thresholds, minimums and caps", () => {
    expect(calculate([policy("percentage")]).totalCommissionMinor).toBe(500);
    expect(
      calculate([
        policy(
          "fixed",
          {},
          { ...defaultEffect, model: { type: "fixed", fixedMinor: 275 } },
        ),
      ]).totalCommissionMinor,
    ).toBe(275);
    expect(
      calculate([
        policy(
          "combined",
          {},
          {
            ...defaultEffect,
            model: { type: "combined", rateBps: 250, fixedMinor: 99 },
          },
        ),
      ]).totalCommissionMinor,
    ).toBe(349);
    expect(
      calculate([
        policy(
          "minimum",
          {},
          {
            ...defaultEffect,
            model: { type: "percentage", rateBps: 10, minimumMinor: 200 },
          },
        ),
      ]).totalCommissionMinor,
    ).toBe(200);
    expect(
      calculate([
        policy(
          "cap",
          {},
          {
            ...defaultEffect,
            model: { type: "percentage", rateBps: 2_000, maximumMinor: 600 },
          },
        ),
      ]).totalCommissionMinor,
    ).toBe(600);
    expect(
      calculate([
        policy(
          "threshold",
          {},
          {
            ...defaultEffect,
            model: {
              type: "threshold",
              thresholdMinor: 10_000,
              appliesWhen: "above",
              rateBps: 500,
              fixedMinor: 10,
            },
          },
        ),
      ]).totalCommissionMinor,
    ).toBe(0);
  });

  it("keeps one-minor-unit split allocations balanced after rounding", () => {
    const splitEffect: CommissionEffect = {
      ...defaultEffect,
      model: { type: "fixed", fixedMinor: 1 },
      allocation: {
        sellerBps: 5_000,
        buyerBps: 5_000,
        platformAbsorbedBps: 0,
      },
    };
    const result = calculate([policy("split", {}, splitEffect)]);
    expect(
      result.sellerChargeMinor +
        result.buyerChargeMinor +
        result.platformAbsorbedMinor,
    ).toBe(result.totalCommissionMinor);
  });

  it("never recognizes more revenue than the rounded billed allocation", () => {
    const result = calculate([
      policy(
        "absorbed-rounding",
        {},
        {
          ...defaultEffect,
          model: { type: "fixed", fixedMinor: 1 },
          allocation: {
            sellerBps: 3_333,
            buyerBps: 3_333,
            platformAbsorbedBps: 3_334,
          },
        },
      ),
    ]);
    expect(result.sellerChargeMinor + result.buyerChargeMinor).toBe(0);
    expect(result.platformAbsorbedMinor).toBe(1);
    expect(result.platformRevenueMinor).toBe(0);
  });

  it("supports progressive and cliff tiers", () => {
    const tiers = [
      { fromMinor: 0, toMinor: 5_000, rateBps: 1_000, fixedMinor: 0 },
      { fromMinor: 5_000, rateBps: 500, fixedMinor: 0 },
    ];
    const progressive = calculate([
      policy(
        "progressive",
        {},
        {
          ...defaultEffect,
          model: {
            type: "tiered",
            tierMode: "progressive",
            basis: "transaction_amount",
            tiers,
          },
        },
      ),
    ]);
    const cliff = calculate([
      policy(
        "cliff",
        {},
        {
          ...defaultEffect,
          model: {
            type: "tiered",
            tierMode: "cliff",
            basis: "transaction_amount",
            tiers,
          },
        },
      ),
    ]);
    expect(progressive.totalCommissionMinor).toBe(750);
    expect(cliff.totalCommissionMinor).toBe(500);
  });

  it("supports explicit period-based historical volume tiers", () => {
    const result = calculate(
      [
        policy(
          "volume",
          {},
          {
            ...defaultEffect,
            model: {
              type: "tiered",
              tierMode: "progressive",
              basis: "historical_volume",
              volumePeriod: "month",
              tiers: [
                {
                  fromMinor: 0,
                  toMinor: 10_000,
                  rateBps: 1_000,
                  fixedMinor: 0,
                },
                { fromMinor: 10_000, rateBps: 500, fixedMinor: 0 },
              ],
            },
          },
        ),
      ],
      { itemSubtotalMinor: 4_000, historicalVolumeMinor: 8_000 },
    );
    expect(result.totalCommissionMinor).toBe(300);
  });

  it("applies promotion adjustments through explicit campaign-scoped rules", () => {
    const promotion = policy(
      "campaign-half",
      { campaignIds: ["campaign-1"] },
      {
        kind: "adjustment",
        adjustment: { type: "percentage_discount", discountBps: 5_000 },
        stackingPolicy: "exclusive",
        promotionId: "existing-promotion-1",
      },
    );
    const result = calculate([policy("global"), promotion], {
      campaignIds: ["campaign-1"],
    });
    expect(result.grossCommissionMinor).toBe(500);
    expect(result.adjustmentMinor).toBe(250);
    expect(result.totalCommissionMinor).toBe(250);
    expect(result.appliedAdjustmentRuleIds).toEqual(["campaign-half.rule"]);
  });

  it("separates tax, seller deduction, buyer fee and absorbed amount", () => {
    const result = calculate([
      policy(
        "shared",
        {},
        {
          ...defaultEffect,
          allocation: {
            sellerBps: 5_000,
            buyerBps: 2_500,
            platformAbsorbedBps: 2_500,
          },
          tax: { mode: "exclusive", rateBps: 2_000 },
        },
      ),
    ]);
    expect(result.netCommissionExcludingTaxMinor).toBe(500);
    expect(result.commissionTaxMinor).toBe(100);
    expect(result.totalCommissionMinor).toBe(600);
    expect(result.sellerChargeMinor).toBe(300);
    expect(result.buyerChargeMinor).toBe(150);
    expect(result.platformAbsorbedMinor).toBe(150);
    expect(result.platformRevenueMinor).toBe(375);
    expect(result.sellerPayableMinor).toBe(9_700);
    expect(result.buyerTotalMinor).toBe(10_650);
  });

  it("keeps historical snapshots stable after current policy changes", () => {
    const original = calculate([policy("global")]);
    const changed = calculate([
      policy(
        "global",
        {},
        { ...defaultEffect, model: { type: "percentage", rateBps: 800 } },
      ),
    ]);
    expect(original.totalCommissionMinor).toBe(500);
    expect(changed.totalCommissionMinor).toBe(800);
    expect(original.effectSnapshot).toMatchObject({
      kind: "commission",
      model: { type: "percentage", rateBps: 500 },
    });
    expect(original.snapshotHash).not.toBe(changed.snapshotHash);
  });

  it("reverses full and partial refunds from the immutable calculation", () => {
    const calculation = calculate([policy("global")]);
    const partial = calculateCommissionReversal({
      calculation,
      refundBaseMinor: 4_000,
      idempotencyKey: "refund-partial-1",
      occurredAt: "2026-08-25T12:00:00.000Z",
    });
    const full = calculateCommissionReversal({
      calculation,
      refundBaseMinor: 10_000,
      idempotencyKey: "refund-full-0001",
      occurredAt: "2026-08-25T13:00:00.000Z",
    });
    expect(partial).toMatchObject({
      state: "partially_reversed",
      reversedCommissionMinor: 200,
      sellerCreditMinor: 200,
      platformRevenueReversalMinor: 200,
    });
    expect(full).toMatchObject({
      state: "reversed",
      reversedCommissionMinor: 500,
      sellerCreditMinor: 500,
    });
  });

  it("routes partial full-only refunds to manual review", () => {
    const calculation = calculate([
      policy("full-only", {}, { ...defaultEffect, refundPolicy: "full_only" }),
    ]);
    const reversal = calculateCommissionReversal({
      calculation,
      refundBaseMinor: 1_000,
      idempotencyKey: "refund-review01",
      occurredAt: "2026-08-25T13:00:00.000Z",
    });
    expect(reversal.state).toBe("manual_review");
    expect(reversal.reversedCommissionMinor).toBe(0);
  });

  it("retains a non-refundable commission without creating a financial reversal", () => {
    const calculation = calculate([
      policy(
        "retained",
        {},
        {
          ...defaultEffect,
          refundPolicy: "non_refundable",
        },
      ),
    ]);
    const reversal = calculateCommissionReversal({
      calculation,
      refundBaseMinor: 10_000,
      idempotencyKey: "refund-retained-01",
      occurredAt: "2026-08-25T13:00:00.000Z",
    });
    expect(reversal).toMatchObject({
      state: "retained",
      reversedCommissionMinor: 0,
      sellerCreditMinor: 0,
      platformRevenueReversalMinor: 0,
    });
  });
});
