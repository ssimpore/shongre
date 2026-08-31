import type {
  CommissionAnalyticsQuery,
  CommissionAnalyticsRow,
  CommissionCalculation,
  CommissionCalculationInput,
  CommissionReversal,
  CommercialConfigurationVersion,
  CommissionPolicy,
} from "@shongre/contracts/monetization";
import type { CommissionServiceContract } from "../../contracts/commission.contract";
import { httpClient } from "./http-client";

export class HttpCommissionService implements CommissionServiceContract {
  preview(input: CommissionCalculationInput) {
    return httpClient.post<CommissionCalculation>(
      "/admin/commissions/simulate",
      input,
    );
  }

  getCalculation(calculationId: string) {
    return httpClient.get<CommissionCalculation>(
      `/admin/commissions/calculations/${encodeURIComponent(calculationId)}`,
    );
  }

  reverse(
    calculationId: string,
    input: {
      refundBaseMinor: number;
      idempotencyKey: string;
      occurredAt?: string;
    },
  ) {
    return httpClient.post<CommissionReversal>(
      `/admin/commissions/calculations/${encodeURIComponent(calculationId)}/reversals`,
      input,
    );
  }

  getAnalytics(query: CommissionAnalyticsQuery) {
    return httpClient.get<CommissionAnalyticsRow[]>(
      "/admin/commissions/analytics",
      { params: query },
    );
  }

  createDraft(input: {
    marketCode: string;
    policies: CommissionPolicy[];
    reason: string;
    effectiveFrom?: string;
  }) {
    return httpClient.post<CommercialConfigurationVersion>(
      "/admin/commissions/drafts",
      {
        marketCode: input.marketCode,
        reason: input.reason,
        effectiveFrom: input.effectiveFrom,
        commissionPolicies: input.policies,
      },
    );
  }

  transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish",
    reason: string,
  ) {
    return httpClient.post<CommercialConfigurationVersion>(
      `/admin/commissions/versions/${encodeURIComponent(versionId)}/${action}`,
      { reason },
    );
  }
}

export const httpCommissionService = new HttpCommissionService();
