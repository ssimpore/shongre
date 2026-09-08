import type {
  CommissionAnalyticsQuery,
  CommissionAnalyticsRow,
  CommissionCalculation,
  CommissionCalculationInput,
  CommissionReversal,
  CommercialConfigurationVersion,
  CommissionPolicy,
} from "@shongre/contracts/monetization";
import { apiOperation } from "./generated-api-operation";
import type { CommissionServiceContract } from "../../contracts/commission.contract";

export class HttpCommissionService implements CommissionServiceContract {
  preview(input: CommissionCalculationInput) {
    return apiOperation<CommissionCalculation, "postAdminCommissionsSimulate">(
      "postAdminCommissionsSimulate",
      { body: input },
    );
  }

  getCalculation(calculationId: string) {
    return apiOperation<
      CommissionCalculation,
      "getAdminCommissionsCalculationsById"
    >("getAdminCommissionsCalculationsById", { path: { id: calculationId } });
  }

  reverse(
    calculationId: string,
    input: {
      refundBaseMinor: number;
      idempotencyKey: string;
      occurredAt?: string;
    },
  ) {
    return apiOperation<
      CommissionReversal,
      "postAdminCommissionsCalculationsByIdReversals"
    >("postAdminCommissionsCalculationsByIdReversals", {
      path: { id: calculationId },
      body: input,
    });
  }

  getAnalytics(query: CommissionAnalyticsQuery) {
    return apiOperation<
      CommissionAnalyticsRow[],
      "getAdminCommissionsAnalytics"
    >("getAdminCommissionsAnalytics", { query: query });
  }

  createDraft(input: {
    marketCode: string;
    policies: CommissionPolicy[];
    reason: string;
    effectiveFrom?: string;
  }) {
    return apiOperation<
      CommercialConfigurationVersion,
      "postAdminCommissionsDrafts"
    >("postAdminCommissionsDrafts", {
      body: {
        marketCode: input.marketCode,
        reason: input.reason,
        effectiveFrom: input.effectiveFrom,
        commissionPolicies: input.policies,
      },
    });
  }

  transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish",
    reason: string,
  ) {
    const input = { path: { id: versionId }, body: { reason } };
    switch (action) {
      case "submit":
        return apiOperation<
          CommercialConfigurationVersion,
          "postAdminCommissionsVersionsByIdSubmit"
        >("postAdminCommissionsVersionsByIdSubmit", input);
      case "approve":
        return apiOperation<
          CommercialConfigurationVersion,
          "postAdminCommissionsVersionsByIdApprove"
        >("postAdminCommissionsVersionsByIdApprove", input);
      case "publish":
        return apiOperation<
          CommercialConfigurationVersion,
          "postAdminCommissionsVersionsByIdPublish"
        >("postAdminCommissionsVersionsByIdPublish", input);
    }
  }
}

export const httpCommissionService = new HttpCommissionService();
