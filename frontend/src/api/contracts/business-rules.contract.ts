import type {
  ActiveEntitlement,
  BillingOverview,
  CommercialConfigurationVersion,
  CommercialDraftPatch,
  ComplimentaryGrantDecisionInput,
  ComplimentaryGrantRequestInput,
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

export interface InvoiceDocument {
  fileName: string;
  mimeType: string;
  content: string;
}

export type {
  ComplimentaryGrantDecisionInput,
  ComplimentaryGrantRequestInput,
} from "@shongre/contracts/monetization";

export interface ComplimentaryGrantRequestResult extends ComplimentaryGrantRequestInput {
  id: string;
  status: "pending_approval";
  requestedBy: string;
}

export interface ComplimentaryGrantDecisionResult {
  requestId: string;
  decision: "approved" | "rejected";
  decidedBy?: string;
  grantId?: string;
}

export interface BusinessRulesServiceContract {
  getCatalog(marketContext: MarketContext): Promise<MonetizationCatalog>;
  getProfessionalCatalogPresentation(
    marketContext: MarketContext,
  ): Promise<ProfessionalCatalogPresentation>;
  evaluate(
    marketContext: MarketContext,
    context: RuleEvaluationContext,
  ): Promise<RuleEvaluationResult>;
  createQuote(
    marketContext: MarketContext,
    request: QuoteRequest,
  ): Promise<MonetizationQuote>;
  createCheckout(
    marketContext: MarketContext,
    quoteId: string,
    idempotencyKey: string,
  ): Promise<MonetizationOrder>;
  validatePromotion(
    marketContext: MarketContext,
    request: PromotionValidationRequest,
  ): Promise<PromotionValidationResult>;
  getActiveEntitlements(
    marketContext: MarketContext,
  ): Promise<ActiveEntitlement[]>;
  getSubscriptions(
    marketContext: MarketContext,
  ): Promise<MonetizationSubscription[]>;
  getBillingOverview(marketContext: MarketContext): Promise<BillingOverview>;
  getInvoiceDocument(
    marketContext: MarketContext,
    invoiceId: string,
  ): Promise<InvoiceDocument>;
  previewSubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ): Promise<SubscriptionChangePreview>;
  applySubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ): Promise<MonetizationSubscription>;
  updateSubscriptionCancellation(
    marketContext: MarketContext,
    request: SubscriptionCancellationRequest,
  ): Promise<MonetizationSubscription>;
  getAdminOverview(
    marketContext: MarketContext,
  ): Promise<MonetizationAdminOverview>;
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
