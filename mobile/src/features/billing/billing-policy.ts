export type BillingProductClass =
  "physical-marketplace-transaction" | "digital-listing-promotion";

export type BillingChannelDecision =
  "external-payment-eligible" | "store-policy-review-required";

/** Pure store-policy decision shared by the native billing runtime and contract tests. */
export function classifyBillingProduct(
  productClass: BillingProductClass,
): BillingChannelDecision {
  return productClass === "physical-marketplace-transaction"
    ? "external-payment-eligible"
    : "store-policy-review-required";
}
