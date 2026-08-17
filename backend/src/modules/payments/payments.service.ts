import { IPaymentProvider, PaymentIntentResult, providers } from '../../integrations/providers/index.js';

export type { PaymentIntentResult };

export class PaymentsService {
  constructor(private paymentProvider: IPaymentProvider = providers.payment) {}

  async createPaymentIntent(amount: number, currency = 'EUR', metadata?: Record<string, string>): Promise<PaymentIntentResult> {
    return this.paymentProvider.createPaymentIntent(amount, currency, metadata);
  }

  async requestSellerPayout(sellerId: string, amount: number, iban: string): Promise<{ payoutId: string; status: 'completed' | 'processing' }> {
    return this.paymentProvider.requestPayout(sellerId, amount, iban);
  }

  async getSellerBalance(sellerId: string): Promise<{ available: number; pending: number; currency: string }> {
    return this.paymentProvider.getBalance(sellerId);
  }
}

export const paymentsService = new PaymentsService();
