import type {
  CommissionAnalyticsQuery,
  CommissionAnalyticsRow,
  CommissionCalculation,
  CommissionCalculationInput,
  CommissionReversal,
  CommercialConfigurationVersion,
  CommissionPolicy,
} from "@shongre/contracts/monetization";

export interface CommissionServiceContract {
  preview(input: CommissionCalculationInput): Promise<CommissionCalculation>;
  getCalculation(calculationId: string): Promise<CommissionCalculation>;
  reverse(
    calculationId: string,
    input: {
      refundBaseMinor: number;
      idempotencyKey: string;
      occurredAt?: string;
    },
  ): Promise<CommissionReversal>;
  getAnalytics(
    query: CommissionAnalyticsQuery,
  ): Promise<CommissionAnalyticsRow[]>;
  createDraft(input: {
    marketCode: string;
    policies: CommissionPolicy[];
    reason: string;
    effectiveFrom?: string;
  }): Promise<CommercialConfigurationVersion>;
  transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish",
    reason: string,
  ): Promise<CommercialConfigurationVersion>;
}
