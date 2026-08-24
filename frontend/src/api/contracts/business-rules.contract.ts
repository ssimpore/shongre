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

export interface InvoiceDocument {
  fileName: string;
  mimeType: string;
  content: string;
}

export interface ComplimentaryGrantRequestInput {
  accountId: string;
  productVersionId: string;
  campaignId?: string;
  reason: string;
  startsAt: string;
  endsAt: string;
  idempotencyKey: string;
}

export interface ComplimentaryGrantRequestResult extends ComplimentaryGrantRequestInput {
  id: string;
  status: "pending_approval";
  requestedBy: string;
}

export interface ComplimentaryGrantDecisionInput {
  decision: "approved" | "rejected";
  reason: string;
  idempotencyKey: string;
}

export interface ComplimentaryGrantDecisionResult {
  requestId: string;
  decision: "approved" | "rejected";
  decidedBy?: string;
  grantId?: string;
}

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
  getBillingOverview(): Promise<BillingOverview>;
  getInvoiceDocument(invoiceId: string): Promise<InvoiceDocument>;
  previewSubscriptionChange(
    request: SubscriptionChangeRequest,
  ): Promise<SubscriptionChangePreview>;
  applySubscriptionChange(
    request: SubscriptionChangeRequest,
  ): Promise<MonetizationSubscription>;
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
  requestComplimentaryGrant(
    input: ComplimentaryGrantRequestInput,
  ): Promise<ComplimentaryGrantRequestResult>;
  decideComplimentaryGrant(
    requestId: string,
    input: ComplimentaryGrantDecisionInput,
  ): Promise<ComplimentaryGrantDecisionResult>;
}
