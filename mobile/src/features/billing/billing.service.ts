export type BillingProductClass =
  "physical-marketplace-transaction" | "digital-listing-promotion";

export interface EntitlementSnapshot {
  source: "backend";
  featuredCredits: number;
  bumpCredits: number;
  storeEnabled: boolean;
}

export interface BillingService {
  restoreEntitlements(): Promise<EntitlementSnapshot>;
  classify(
    productClass: BillingProductClass,
  ): "external-payment-eligible" | "store-policy-review-required";
}

export const billingService: BillingService = {
  async restoreEntitlements() {
    return {
      source: "backend",
      featuredCredits: 0,
      bumpCredits: 0,
      storeEnabled: false,
    };
  },
  classify(productClass) {
    return productClass === "physical-marketplace-transaction"
      ? "external-payment-eligible"
      : "store-policy-review-required";
  },
};
