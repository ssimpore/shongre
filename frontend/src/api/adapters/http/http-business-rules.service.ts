import type {
  ActiveEntitlement,
  BillingOverview,
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
  SubscriptionChangePreview,
  SubscriptionChangeRequest,
} from "@shongre/contracts/monetization";
import type {
  BusinessRulesServiceContract,
  ComplimentaryGrantDecisionInput,
  ComplimentaryGrantDecisionResult,
  ComplimentaryGrantRequestInput,
  ComplimentaryGrantRequestResult,
  InvoiceDocument,
} from "../../contracts/business-rules.contract";
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

  getBillingOverview() {
    return httpClient.get<BillingOverview>("/monetization/billing");
  }

  getInvoiceDocument(invoiceId: string) {
    return httpClient.get<InvoiceDocument>(
      `/monetization/invoices/${encodeURIComponent(invoiceId)}/document`,
    );
  }

  previewSubscriptionChange(request: SubscriptionChangeRequest) {
    return httpClient.post<SubscriptionChangePreview>(
      `/monetization/subscriptions/${encodeURIComponent(request.subscriptionId)}/change-preview`,
      request,
    );
  }

  applySubscriptionChange(request: SubscriptionChangeRequest) {
    return httpClient.post<MonetizationSubscription>(
      `/monetization/subscriptions/${encodeURIComponent(request.subscriptionId)}/change`,
      request,
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

  requestComplimentaryGrant(input: ComplimentaryGrantRequestInput) {
    return httpClient.post<ComplimentaryGrantRequestResult>(
      "/admin/monetization/complimentary-grants/requests",
      input,
    );
  }

  decideComplimentaryGrant(
    requestId: string,
    input: ComplimentaryGrantDecisionInput,
  ) {
    return httpClient.post<ComplimentaryGrantDecisionResult>(
      `/admin/monetization/complimentary-grants/requests/${encodeURIComponent(requestId)}/decision`,
      input,
    );
  }
}

export const httpBusinessRulesService = new HttpBusinessRulesService();
