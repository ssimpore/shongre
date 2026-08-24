import {
  IPaymentProvider,
  PaymentIntentResult,
  providers,
} from "../../integrations/providers/index.js";
import { repositories } from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";

export type { PaymentIntentResult };

export class PaymentsService {
  constructor(
    private paymentProvider: IPaymentProvider = providers.payment,
    private complianceRepo = repositories.compliance,
  ) {}

  async createPaymentIntent(
    amount: number,
    currency = "EUR",
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    return this.paymentProvider.createPaymentIntent(amount, currency, metadata);
  }

  async requestSellerPayout(
    sellerId: string,
    amountMinor: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
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
    const accountReference = await this.getPayoutAccount(sellerId);
    return this.paymentProvider.requestPayout(
      accountReference,
      amountMinor,
      currency,
      idempotencyKey,
    );
  }

  async getSellerBalance(sellerId: string): Promise<{
    availableMinor: number;
    pendingMinor: number;
    currency: string;
  }> {
    return this.paymentProvider.getBalance(
      await this.getPayoutAccount(sellerId),
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
