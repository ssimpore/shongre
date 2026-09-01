import type {
  ActiveEntitlement,
  BillingOverview,
  CommercialConfigurationVersion,
  CommercialDraftPatch,
  MonetizationAdminOverview,
  MonetizationCatalog,
  MonetizationOrder,
  ProfessionalCatalogPresentation,
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
import type { MarketContext } from "@shongre/contracts";
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
  private marketHeaders(marketContext: MarketContext) {
    if (!marketContext.countryCode) {
      throw new Error("Un contexte marché explicite est requis.");
    }
    return { "X-Shongre-Market": marketContext.countryCode };
  }

  getCatalog(marketContext: MarketContext) {
    return httpClient.get<MonetizationCatalog>("/business-rules/catalog", {
      headers: this.marketHeaders(marketContext),
      params: { marketCode: marketContext.countryCode ?? undefined },
    });
  }

  getProfessionalCatalogPresentation(marketContext: MarketContext) {
    return httpClient.get<ProfessionalCatalogPresentation>(
      "/monetization/professional-plans",
      { headers: this.marketHeaders(marketContext) },
    );
  }

  evaluate(marketContext: MarketContext, context: RuleEvaluationContext) {
    return httpClient.post<RuleEvaluationResult>(
      "/admin/business-rules/simulate",
      context,
      { headers: this.marketHeaders(marketContext) },
    );
  }

  createQuote(marketContext: MarketContext, request: QuoteRequest) {
    return httpClient.post<MonetizationQuote>("/monetization/quotes", request, {
      headers: this.marketHeaders(marketContext),
    });
  }

  createCheckout(
    marketContext: MarketContext,
    quoteId: string,
    idempotencyKey: string,
  ) {
    return httpClient.post<MonetizationOrder>(
      "/monetization/checkouts",
      { quoteId, idempotencyKey },
      { headers: this.marketHeaders(marketContext) },
    );
  }

  validatePromotion(
    marketContext: MarketContext,
    request: PromotionValidationRequest,
  ) {
    return httpClient.post<PromotionValidationResult>(
      "/monetization/promotions/validate",
      request,
      { headers: this.marketHeaders(marketContext) },
    );
  }

  getActiveEntitlements(marketContext: MarketContext) {
    return httpClient.get<ActiveEntitlement[]>("/monetization/entitlements", {
      headers: this.marketHeaders(marketContext),
    });
  }

  getSubscriptions(marketContext: MarketContext) {
    return httpClient.get<MonetizationSubscription[]>(
      "/monetization/subscriptions",
      { headers: this.marketHeaders(marketContext) },
    );
  }

  getBillingOverview(marketContext: MarketContext) {
    return httpClient.get<BillingOverview>("/monetization/billing", {
      headers: this.marketHeaders(marketContext),
    });
  }

  getInvoiceDocument(marketContext: MarketContext, invoiceId: string) {
    return httpClient.get<InvoiceDocument>(
      `/monetization/invoices/${encodeURIComponent(invoiceId)}/document`,
      { headers: this.marketHeaders(marketContext) },
    );
  }

  previewSubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ) {
    return httpClient.post<SubscriptionChangePreview>(
      `/monetization/subscriptions/${encodeURIComponent(request.subscriptionId)}/change-preview`,
      request,
      { headers: this.marketHeaders(marketContext) },
    );
  }

  applySubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ) {
    return httpClient.post<MonetizationSubscription>(
      `/monetization/subscriptions/${encodeURIComponent(request.subscriptionId)}/change`,
      request,
      { headers: this.marketHeaders(marketContext) },
    );
  }

  updateSubscriptionCancellation(
    marketContext: MarketContext,
    request: SubscriptionCancellationRequest,
  ) {
    return httpClient.patch<MonetizationSubscription>(
      `/monetization/subscriptions/${encodeURIComponent(request.subscriptionId)}`,
      { cancelAtPeriodEnd: request.cancelAtPeriodEnd },
      { headers: this.marketHeaders(marketContext) },
    );
  }

  getAdminOverview(marketContext: MarketContext) {
    return httpClient.get<MonetizationAdminOverview>("/admin/business-rules", {
      headers: this.marketHeaders(marketContext),
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
