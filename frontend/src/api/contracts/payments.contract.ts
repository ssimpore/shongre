import type { MonetizationOrder } from "@shongre/contracts/monetization";

export const PAYOUT_REQUEST_CONSTRAINTS = {
  minimumAmountMinor: 100,
  minorUnitsPerMajor: 100,
  majorInputStep: 0.01,
} as const;

export interface PaymentsServiceContract {
  createCheckout(
    quoteId: string,
    idempotencyKey: string,
  ): Promise<MonetizationOrder>;
  requestSellerPayout(input: {
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ payoutId: string; status: "completed" | "processing" }>;
  getSellerBalance(sellerId: string): Promise<{
    availableMinor: number;
    pendingMinor: number;
    currency: string;
  }>;
}
