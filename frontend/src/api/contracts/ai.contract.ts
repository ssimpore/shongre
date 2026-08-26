/**
 * AI assistance available to the product, expressed as a backend capability.
 *
 * The frontend previously talked to Google Gemini directly from the browser,
 * reading a browser-prefixed AI key — which shipped it to every visitor because
 * the legacy bundler exposed that prefix to the browser. A provider key is a
 * server-side secret, so AI joins every other backend capability here: the UI
 * calls the contract, demo answers it deterministically today, and the HTTP
 * adapter will hand it to `backend/` (which owns the provider credentials)
 * without any UI change.
 */

export interface ListingAssistanceRequest {
  rawInput: string;
  condition?: string;
  categoryHint?: string;
  existingTitle?: string;
  existingPrice?: number;
}

export interface ListingAssistanceResult {
  title: string;
  description: string;
  suggestedCategorySlug: string;
  suggestedSubCategorySlug: string;
  estimatedPrice: {
    min: number;
    max: number;
    recommended: number;
  };
  tags: string[];
  tips: string[];
}

export interface ListingSafetyRequest {
  title: string;
  description: string;
  price: number;
  sellerName?: string;
}

export interface ListingSafetyAnalysis {
  /** 0 (safe) to 100 (high risk). */
  riskScore: number;
  verdict: "compliant" | "suspicious" | "prohibited_item" | "potential_scam";
  /** 0 to 100. */
  confidence: number;
  summary: string;
  flaggedKeywords: string[];
  recommendedAction: "approve" | "request_clarification" | "hide" | "delete";
}

export interface AiServiceContract {
  /** Drafts a listing from a seller's rough input. */
  generateListingAssistance(
    request: ListingAssistanceRequest,
  ): Promise<ListingAssistanceResult>;
  /** Scores a listing for moderation triage. */
  analyzeListingSafety(
    request: ListingSafetyRequest,
  ): Promise<ListingSafetyAnalysis>;
}
