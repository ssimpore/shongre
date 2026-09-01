import type { MonetizationOrder } from "@shongre/contracts/monetization";
import type { MarketContext } from "@shongre/contracts";

export const PAYOUT_REQUEST_CONSTRAINTS = {
  minimumAmountMinor: 100,
  minorUnitsPerMajor: 100,
  majorInputStep: 0.01,
} as const;

export interface PaymentsServiceContract {
  createCheckout(
    marketContext: MarketContext,
    quoteId: string,
    idempotencyKey: string,
  ): Promise<MonetizationOrder>;
  requestSellerPayout(
    marketContext: MarketContext,
    input: {
      amountMinor: number;
      currency: string;
      idempotencyKey: string;
    },
  ): Promise<{ payoutId: string; status: "completed" | "processing" }>;
  getSellerBalance(
    marketContext: MarketContext,
    sellerId: string,
  ): Promise<{
    availableMinor: number;
    pendingMinor: number;
    currency: string;
  }>;
}
