import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import type {
  CommissionAnalyticsQuery,
  CommissionCalculationInput,
  CommissionReversal,
} from "@shongre/contracts/monetization";
import {
  calculateCommission,
  calculateCommissionReversal,
} from "@shongre/shared";
import { simulateNetworkDelay } from "../../client/api-client.config";
import type { CommissionServiceContract } from "../../contracts/commission.contract";
import { demoBusinessRulesService } from "./demo-business-rules.service";
import { convertDemoReportingMinorUnits } from "./demo-reporting-currency";
import { requireDemoCapability } from "./demo-authorization";

export class DemoCommissionService implements CommissionServiceContract {
  private readonly calculations = new Map(
    [] as Array<[string, ReturnType<typeof calculateCommission>]>,
  );
  private readonly reversals = new Map<string, CommissionReversal>();

  async preview(input: CommissionCalculationInput) {
    await simulateNetworkDelay(60);
    requireDemoCapability("commissions.simulate");
    const calculation = calculateCommission({
      configurationVersionId:
        BASELINE_MONETIZATION_CATALOG.configurationVersionId,
      policies: BASELINE_MONETIZATION_CATALOG.commissionPolicies,
      input: { ...input, transactionId: undefined },
      calculatedAt: input.effectiveAt,
    });
    this.calculations.set(calculation.id, structuredClone(calculation));
    return calculation;
  }

  async getCalculation(calculationId: string) {
    await simulateNetworkDelay(40);
    requireDemoCapability("commissions.read");
    const calculation = this.calculations.get(calculationId);
    if (!calculation) throw new Error("Calcul de commission introuvable.");
    return structuredClone(calculation);
  }

  async reverse(
    calculationId: string,
    input: {
      refundBaseMinor: number;
      idempotencyKey: string;
      occurredAt?: string;
    },
  ) {
    requireDemoCapability("commissions.manage");
    const existing = [...this.reversals.values()].find(
      (reversal) => reversal.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return structuredClone(existing);
    const calculation = await this.getCalculation(calculationId);
    const totals = [...this.reversals.values()]
      .filter(
        (reversal) =>
          reversal.calculationId === calculationId &&
          reversal.state !== "manual_review",
      )
      .reduce(
        (sum, reversal) => ({
          base: sum.base + reversal.reversedBaseMinor,
          commission: sum.commission + reversal.reversedCommissionMinor,
          tax: sum.tax + reversal.reversedTaxMinor,
          seller: sum.seller + reversal.sellerCreditMinor,
          buyer: sum.buyer + reversal.buyerCreditMinor,
          revenue: sum.revenue + reversal.platformRevenueReversalMinor,
        }),
        { base: 0, commission: 0, tax: 0, seller: 0, buyer: 0, revenue: 0 },
      );
    if (
      input.refundBaseMinor <= 0 ||
      input.refundBaseMinor > calculation.baseAmountMinor - totals.base
    ) {
      throw new Error("Le remboursement dépasse la base restante.");
    }
    const reversal = calculateCommissionReversal({
      calculation,
      refundBaseMinor: input.refundBaseMinor,
      previouslyReversedBaseMinor: totals.base,
      previouslyReversedCommissionMinor: totals.commission,
      previouslyReversedTaxMinor: totals.tax,
      previouslyCreditedSellerMinor: totals.seller,
      previouslyCreditedBuyerMinor: totals.buyer,
      previouslyReversedRevenueMinor: totals.revenue,
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt || "2026-08-24T14:00:00.000Z",
    });
    this.reversals.set(reversal.id, structuredClone(reversal));
    return reversal;
  }

  async getAnalytics(query: CommissionAnalyticsQuery) {
    await simulateNetworkDelay(60);
    requireDemoCapability("commissions.analytics.read");
    const convert = (amountMinor: number) =>
      convertDemoReportingMinorUnits(amountMinor, query.currency);
    return [
      {
        date: query.to,
        marketCode: query.marketCode === "ALL" ? "FR" : query.marketCode,
        verticalId: query.verticalId,
        categoryId: query.categoryId,
        planId: query.planId,
        currency: query.currency,
        transactionCount: 184,
        gmvMinor: convert(4_860_000),
        grossCommissionMinor: convert(145_800),
        commissionDiscountMinor: convert(12_400),
        commissionRevenueMinor: convert(111_167),
        commissionRefundMinor: convert(3_250),
        effectiveTakeRateBps: 222,
      },
    ];
  }

  createDraft(input: {
    marketCode: string;
    policies: typeof BASELINE_MONETIZATION_CATALOG.commissionPolicies;
    reason: string;
    effectiveFrom?: string;
  }) {
    requireDemoCapability("commissions.manage");
    return demoBusinessRulesService.createDraft({
      marketCode: input.marketCode,
      reason: input.reason,
      effectiveFrom: input.effectiveFrom,
      commissionPolicies: input.policies,
    });
  }

  transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish",
    reason: string,
  ) {
    requireDemoCapability(
      action === "publish" ? "commissions.publish" : "commissions.manage",
    );
    return demoBusinessRulesService.transitionVersion(
      versionId,
      action,
      reason,
    );
  }
}

export const demoCommissionService = new DemoCommissionService();
