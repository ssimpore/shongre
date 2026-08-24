import type { MonetizationOrder } from "@shongre/contracts/monetization";

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
