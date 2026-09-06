import { createHash } from "node:crypto";

const PUBLIC_PROMOTION_PROOF = /^promotion_[a-f0-9]{64}$/;

/**
 * Produces a stable public proof that a market promotion was resolved from an
 * immutable backend source without exposing the order, entitlement or grant
 * identifier itself.
 */
export function createPublicPromotionProofId(input: {
  listingId: string;
  marketCode: string;
  source: string;
  sourceId: string;
}): string {
  if (PUBLIC_PROMOTION_PROOF.test(input.sourceId)) return input.sourceId;
  return `promotion_${createHash("sha256")
    .update(
      [input.listingId, input.marketCode, input.source, input.sourceId].join(
        ":",
      ),
    )
    .digest("hex")}`;
}
