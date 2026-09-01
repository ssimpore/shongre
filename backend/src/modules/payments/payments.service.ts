import { createHash } from "node:crypto";
import type { MarketContext } from "@shongre/contracts";
import {
  IPaymentProvider,
  PaymentIntentResult,
  providers,
} from "../../integrations/providers/index.js";
import { repositories } from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMonetizationMarketContext } from "../business-rules/monetization-market-context.js";

export type { PaymentIntentResult };

export class PaymentsService {
  constructor(
    private paymentProvider: IPaymentProvider = providers.payment,
    private complianceRepo = repositories.compliance,
  ) {}

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    return this.paymentProvider.createPaymentIntent(amount, currency, metadata);
  }

  async requestSellerPayout(
    marketContext: MarketContext,
    sellerId: string,
    amountMinor: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    const market = requireMonetizationMarketContext(marketContext, "paid");
    if (
      !Number.isSafeInteger(amountMinor) ||
      amountMinor <= 0 ||
      !/^[A-Z]{3}$/.test(currency) ||
      !idempotencyKey ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 200
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La demande de versement est invalide.",
      });
    }
    if (currency !== market.currency) {
      throw new AppError({
        code: "CONFLICT",
        message: "La devise ne correspond pas au marché actif.",
      });
    }
    const accountReference = await this.getPayoutAccount(sellerId);
    return this.paymentProvider.requestPayout(
      accountReference,
      amountMinor,
      currency,
      `${market.marketCode}:${createHash("sha256").update(idempotencyKey).digest("hex")}`,
    );
  }

  async getSellerBalance(
    marketContext: MarketContext,
    sellerId: string,
  ): Promise<{
    availableMinor: number;
    pendingMinor: number;
    currency: string;
  }> {
    const market = requireMonetizationMarketContext(marketContext, "read");
    return this.paymentProvider.getBalance(
      await this.getPayoutAccount(sellerId),
      market.currency,
    );
  }

  private async getPayoutAccount(sellerId: string) {
    const records = await this.complianceRepo.listVerificationRecords(sellerId);
    const record = records.find(
      (item) =>
        ["payout", "bank_account", "payment"].includes(item.dimension) &&
        item.state === "verified" &&
        item.providerReference?.startsWith("acct_"),
    );
    if (!record?.providerReference) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Le compte de versement doit d’abord être vérifié.",
      });
    }
    return record.providerReference;
  }
}

export const paymentsService = new PaymentsService();
