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

export interface BusinessRulesServiceContract {
  getCatalog(marketCode?: string): Promise<MonetizationCatalog>;
  evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult>;
  createQuote(request: QuoteRequest): Promise<MonetizationQuote>;
  createCheckout(
    quoteId: string,
    idempotencyKey: string,
  ): Promise<MonetizationOrder>;
  validatePromotion(
    request: PromotionValidationRequest,
  ): Promise<PromotionValidationResult>;
  getActiveEntitlements(): Promise<ActiveEntitlement[]>;
  getSubscriptions(): Promise<MonetizationSubscription[]>;
  updateSubscriptionCancellation(
    request: SubscriptionCancellationRequest,
  ): Promise<MonetizationSubscription>;
  getAdminOverview(marketCode?: string): Promise<MonetizationAdminOverview>;
  createDraft(
    patch: CommercialDraftPatch,
  ): Promise<CommercialConfigurationVersion>;
  transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish" | "rollback",
    reason: string,
  ): Promise<CommercialConfigurationVersion>;
}
