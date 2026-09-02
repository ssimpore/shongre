import type { MarketDetectionRecommendation } from "@shongre/contracts";

export type MarketDetectionOutcome =
  | { kind: "none" }
  | {
      kind: "recommendation";
      recommendation: MarketDetectionRecommendation;
    }
  | { kind: "country_selection_required"; reason: "unknown" | "unavailable" };

/**
 * Maps the server-shaped recommendation into UI state without granting it any
 * routing or authorization authority.
 */
export function resolveMarketDetectionOutcome(input: {
  recommendation: MarketDetectionRecommendation;
  currentCountryCode: string;
  declinedCountryCode?: string | null;
}): MarketDetectionOutcome {
  const { recommendation } = input;
  const detectedCountryCode = recommendation.country?.code;
  if (!detectedCountryCode) {
    // The canonical request has already established a valid market context.
    // Absence of an optional coarse recommendation must not replace it with a
    // late country-selection banner (or turn an unavailable signal into
    // authority). The global gateway owns the no-market selection case.
    return { kind: "none" };
  }
  if (recommendation.experience === "unavailable") {
    return { kind: "country_selection_required", reason: "unavailable" };
  }
  if (
    detectedCountryCode === input.currentCountryCode.toUpperCase() ||
    detectedCountryCode === input.declinedCountryCode
  ) {
    return { kind: "none" };
  }
  return { kind: "recommendation", recommendation };
}
