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
import { apiOperation } from "./generated-api-operation";
import type { MarketContext } from "@shongre/contracts";
import type {
  BusinessRulesServiceContract,
  ComplimentaryGrantDecisionInput,
  ComplimentaryGrantDecisionResult,
  ComplimentaryGrantRequestInput,
  ComplimentaryGrantRequestResult,
  InvoiceDocument,
} from "../../contracts/business-rules.contract";

export class HttpBusinessRulesService implements BusinessRulesServiceContract {
  private marketHeaders(marketContext: MarketContext) {
    if (!marketContext.countryCode) {
      throw new Error("Un contexte marché explicite est requis.");
    }
    return { "X-Shongre-Market": marketContext.countryCode };
  }

  getCatalog(marketContext: MarketContext) {
    return apiOperation<MonetizationCatalog, "getBusinessRulesCatalog">(
      "getBusinessRulesCatalog",
      {
        query: { marketCode: marketContext.countryCode ?? undefined },
        headers: this.marketHeaders(marketContext),
      },
    );
  }

  getProfessionalCatalogPresentation(marketContext: MarketContext) {
    return apiOperation<
      ProfessionalCatalogPresentation,
      "getMonetizationProfessionalPlans"
    >("getMonetizationProfessionalPlans", {
      headers: this.marketHeaders(marketContext),
    });
  }

  evaluate(marketContext: MarketContext, context: RuleEvaluationContext) {
    return apiOperation<RuleEvaluationResult, "postAdminBusinessRulesSimulate">(
      "postAdminBusinessRulesSimulate",
      { body: context, headers: this.marketHeaders(marketContext) },
    );
  }

  createQuote(marketContext: MarketContext, request: QuoteRequest) {
    return apiOperation<MonetizationQuote, "postMonetizationQuotes">(
      "postMonetizationQuotes",
      { body: request, headers: this.marketHeaders(marketContext) },
    );
  }

  createCheckout(
    marketContext: MarketContext,
    quoteId: string,
    idempotencyKey: string,
  ) {
    return apiOperation<MonetizationOrder, "postMonetizationCheckouts">(
      "postMonetizationCheckouts",
      {
        body: { quoteId, idempotencyKey },
        headers: this.marketHeaders(marketContext),
      },
    );
  }

  validatePromotion(
    marketContext: MarketContext,
    request: PromotionValidationRequest,
  ) {
    return apiOperation<
      PromotionValidationResult,
      "postMonetizationPromotionsValidate"
    >("postMonetizationPromotionsValidate", {
      body: request,
      headers: this.marketHeaders(marketContext),
    });
  }

  getActiveEntitlements(marketContext: MarketContext) {
    return apiOperation<ActiveEntitlement[], "getMonetizationEntitlements">(
      "getMonetizationEntitlements",
      { headers: this.marketHeaders(marketContext) },
    );
  }

  getSubscriptions(marketContext: MarketContext) {
    return apiOperation<
      MonetizationSubscription[],
      "getMonetizationSubscriptions"
    >("getMonetizationSubscriptions", {
      headers: this.marketHeaders(marketContext),
    });
  }

  getBillingOverview(marketContext: MarketContext) {
    return apiOperation<BillingOverview, "getMonetizationBilling">(
      "getMonetizationBilling",
      { headers: this.marketHeaders(marketContext) },
    );
  }

  getInvoiceDocument(marketContext: MarketContext, invoiceId: string) {
    return apiOperation<InvoiceDocument, "getMonetizationInvoicesByIdDocument">(
      "getMonetizationInvoicesByIdDocument",
      { path: { id: invoiceId }, headers: this.marketHeaders(marketContext) },
    );
  }

  previewSubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ) {
    return apiOperation<
      SubscriptionChangePreview,
      "postMonetizationSubscriptionsByIdChangePreview"
    >("postMonetizationSubscriptionsByIdChangePreview", {
      path: { id: request.subscriptionId },
      body: request,
      headers: this.marketHeaders(marketContext),
    });
  }

  applySubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ) {
    return apiOperation<
      MonetizationSubscription,
      "postMonetizationSubscriptionsByIdChange"
    >("postMonetizationSubscriptionsByIdChange", {
      path: { id: request.subscriptionId },
      body: request,
      headers: this.marketHeaders(marketContext),
    });
  }

  updateSubscriptionCancellation(
    marketContext: MarketContext,
    request: SubscriptionCancellationRequest,
  ) {
    return apiOperation<
      MonetizationSubscription,
      "patchMonetizationSubscriptionsById"
    >("patchMonetizationSubscriptionsById", {
      path: { id: request.subscriptionId },
      body: { cancelAtPeriodEnd: request.cancelAtPeriodEnd },
      headers: this.marketHeaders(marketContext),
    });
  }

  getAdminOverview(marketContext: MarketContext) {
    return apiOperation<MonetizationAdminOverview, "getAdminBusinessRules">(
      "getAdminBusinessRules",
      { headers: this.marketHeaders(marketContext) },
    );
  }

  createDraft(patch: CommercialDraftPatch) {
    return apiOperation<
      CommercialConfigurationVersion,
      "postAdminBusinessRulesDrafts"
    >("postAdminBusinessRulesDrafts", { body: patch });
  }

  transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish" | "rollback",
    reason: string,
  ) {
    const input = { path: { id: versionId }, body: { reason } };
    switch (action) {
      case "submit":
        return apiOperation<
          CommercialConfigurationVersion,
          "postAdminBusinessRulesVersionsByIdSubmit"
        >("postAdminBusinessRulesVersionsByIdSubmit", input);
      case "approve":
        return apiOperation<
          CommercialConfigurationVersion,
          "postAdminBusinessRulesVersionsByIdApprove"
        >("postAdminBusinessRulesVersionsByIdApprove", input);
      case "publish":
        return apiOperation<
          CommercialConfigurationVersion,
          "postAdminBusinessRulesVersionsByIdPublish"
        >("postAdminBusinessRulesVersionsByIdPublish", input);
      case "rollback":
        return apiOperation<
          CommercialConfigurationVersion,
          "postAdminBusinessRulesVersionsByIdRollback"
        >("postAdminBusinessRulesVersionsByIdRollback", input);
    }
  }

  requestComplimentaryGrant(input: ComplimentaryGrantRequestInput) {
    return apiOperation<
      ComplimentaryGrantRequestResult,
      "postAdminMonetizationComplimentaryGrantsRequests"
    >("postAdminMonetizationComplimentaryGrantsRequests", { body: input });
  }

  decideComplimentaryGrant(
    requestId: string,
    input: ComplimentaryGrantDecisionInput,
  ) {
    return apiOperation<
      ComplimentaryGrantDecisionResult,
      "postAdminMonetizationComplimentaryGrantsRequestsByIdDecision"
    >("postAdminMonetizationComplimentaryGrantsRequestsByIdDecision", {
      path: { id: requestId },
      body: input,
    });
  }
}

export const httpBusinessRulesService = new HttpBusinessRulesService();
