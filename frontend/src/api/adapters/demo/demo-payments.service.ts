import type { MonetizationOrder } from "@shongre/contracts/monetization";
import {
  PAYOUT_REQUEST_CONSTRAINTS,
  PaymentsServiceContract,
} from "../../contracts/payments.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { deterministicDemoId } from "./demo-identifiers";

export class DemoPaymentsService implements PaymentsServiceContract {
  async createCheckout(
    quoteId: string,
    idempotencyKey: string,
  ): Promise<MonetizationOrder> {
    await simulateNetworkDelay();
    const now = new Date().toISOString();
    return {
      id: deterministicDemoId("order_demo", [quoteId, idempotencyKey]),
      quoteId,
      accountId: "demo-account",
      snapshotHash: deterministicDemoId("snapshot", [quoteId]),
      total: { amountMinor: 299, currency: "EUR" },
      status: "paid",
      provider: "demo",
      providerCheckoutId: deterministicDemoId("checkout_demo", [
        idempotencyKey,
      ]),
      createdAt: now,
      updatedAt: now,
    };
  }

  async requestSellerPayout(input: {
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }) {
    await simulateNetworkDelay();
    if (input.amountMinor < PAYOUT_REQUEST_CONSTRAINTS.minimumAmountMinor)
      throw new Error("Le montant du virement est inférieur au minimum.");
    return {
      payoutId: deterministicDemoId("po_demo", [input]),
      status: "completed" as const,
    };
  }

  async getSellerBalance() {
    await simulateNetworkDelay();
    return {
      availableMinor: 48_550,
      pendingMinor: 12_000,
      currency: "EUR",
    };
  }
}

export const demoPaymentsService = new DemoPaymentsService();
