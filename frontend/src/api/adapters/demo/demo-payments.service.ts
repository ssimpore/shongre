import type { MonetizationOrder } from "@shongre/contracts/monetization";
import { getCountryConfig, type MarketContext } from "@shongre/contracts";
import {
  PAYOUT_REQUEST_CONSTRAINTS,
  PaymentsServiceContract,
} from "../../contracts/payments.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { deterministicDemoId } from "./demo-identifiers";
import { requireDemoCapability } from "./demo-authorization";
import { demoBusinessRulesService } from "./demo-business-rules.service";

export class DemoPaymentsService implements PaymentsServiceContract {
  private market(marketContext: MarketContext) {
    const market = marketContext.countryCode
      ? getCountryConfig(marketContext.countryCode)
      : undefined;
    if (
      marketContext.kind !== "market" ||
      !market?.enabled ||
      !market.monetization.enabled ||
      !market.capabilities.payments ||
      marketContext.currency !== market.currency
    ) {
      throw new Error("Paiement indisponible sur ce marché");
    }
    return market;
  }

  async createCheckout(
    marketContext: MarketContext,
    quoteId: string,
    idempotencyKey: string,
  ): Promise<MonetizationOrder> {
    await simulateNetworkDelay();
    requireDemoCapability("payment.initiate");
    this.market(marketContext);
    return demoBusinessRulesService.createCheckout(
      marketContext,
      quoteId,
      idempotencyKey,
    );
  }

  async requestSellerPayout(
    marketContext: MarketContext,
    input: {
      amountMinor: number;
      currency: string;
      idempotencyKey: string;
    },
  ) {
    await simulateNetworkDelay();
    requireDemoCapability("order.manage.seller");
    const market = this.market(marketContext);
    await demoBusinessRulesService.getCatalog(marketContext);
    if (input.currency !== market.currency) {
      throw new Error("La devise ne correspond pas au marché actif.");
    }
    if (input.amountMinor < PAYOUT_REQUEST_CONSTRAINTS.minimumAmountMinor)
      throw new Error("Le montant du virement est inférieur au minimum.");
    return {
      payoutId: deterministicDemoId("po_demo", [market.marketCode, input]),
      status: "completed" as const,
    };
  }

  async getSellerBalance(marketContext: MarketContext) {
    await simulateNetworkDelay();
    requireDemoCapability("order.manage.seller");
    const market = this.market(marketContext);
    await demoBusinessRulesService.getCatalog(marketContext);
    return {
      availableMinor: 48_550,
      pendingMinor: 12_000,
      currency: market.currency,
    };
  }
}

export const demoPaymentsService = new DemoPaymentsService();
