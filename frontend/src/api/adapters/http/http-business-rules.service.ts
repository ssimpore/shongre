import type {
  ActiveEntitlement,
  CommercialConfigurationVersion,
  CommercialDraftPatch,
  MonetizationAdminOverview,
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationQuote,
  MonetizationSubscription,
  PromotionValidationRequest,
  PromotionValidationResult,
  QuoteRequest,
  RuleEvaluationContext,
  RuleEvaluationResult,
  SubscriptionCancellationRequest,
} from "@shongre/contracts/monetization";
import type { BusinessRulesServiceContract } from "../../contracts/business-rules.contract";
import { httpClient } from "./http-client";

export class HttpBusinessRulesService implements BusinessRulesServiceContract {
  getCatalog(marketCode = "FR") {
    return httpClient.get<MonetizationCatalog>("/business-rules/catalog", {
      params: { marketCode },
    });
  }

  evaluate(context: RuleEvaluationContext) {
    return httpClient.post<RuleEvaluationResult>(
      "/admin/business-rules/simulate",
      context,
    );
  }

  createQuote(request: QuoteRequest) {
    return httpClient.post<MonetizationQuote>("/monetization/quotes", request);
  }

  createCheckout(quoteId: string, idempotencyKey: string) {
    return httpClient.post<MonetizationOrder>("/monetization/checkouts", {
      quoteId,
      idempotencyKey,
    });
  }

  validatePromotion(request: PromotionValidationRequest) {
    return httpClient.post<PromotionValidationResult>(
      "/monetization/promotions/validate",
      request,
    );
  }

  getActiveEntitlements() {
    return httpClient.get<ActiveEntitlement[]>("/monetization/entitlements");
  }

  getSubscriptions() {
    return httpClient.get<MonetizationSubscription[]>(
      "/monetization/subscriptions",
    );
  }

  updateSubscriptionCancellation(request: SubscriptionCancellationRequest) {
    return httpClient.patch<MonetizationSubscription>(
      `/monetization/subscriptions/${encodeURIComponent(request.subscriptionId)}`,
      { cancelAtPeriodEnd: request.cancelAtPeriodEnd },
    );
  }

  getAdminOverview(marketCode = "FR") {
    return httpClient.get<MonetizationAdminOverview>("/admin/business-rules", {
      params: { marketCode },
    });
  }

  createDraft(patch: CommercialDraftPatch) {
    return httpClient.post<CommercialConfigurationVersion>(
      "/admin/business-rules/drafts",
      patch,
    );
  }

  transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish" | "rollback",
    reason: string,
  ) {
    return httpClient.post<CommercialConfigurationVersion>(
      `/admin/business-rules/versions/${encodeURIComponent(versionId)}/${action}`,
      { reason },
    );
  }
}

export const httpBusinessRulesService = new HttpBusinessRulesService();
