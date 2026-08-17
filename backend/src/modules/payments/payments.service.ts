import { stripeIntegration } from '../../integrations/stripe/stripe-integration.js';

export interface PaymentIntentResult {
  clientSecret: string;
  status: 'succeeded' | 'requires_action' | 'pending' | 'failed';
  amount: number;
  currency: string;
}

export class PaymentsService {
  async createPaymentIntent(amount: number, currency = 'EUR', metadata?: Record<string, string>): Promise<PaymentIntentResult> {
    const res = await stripeIntegration.initiateEscrowHold('order_temp', amount, currency);
    return {
      clientSecret: res.clientSecret,
      status: res.status,
      amount: res.amount,
      currency: res.currency,
    };
  }

  async requestSellerPayout(sellerId: string, amount: number, iban: string): Promise<{ payoutId: string; status: 'completed' | 'processing' }> {
    return stripeIntegration.payoutSeller(sellerId, amount, iban);
  }

  async getSellerBalance(sellerId: string): Promise<{ available: number; pending: number; currency: string }> {
    return {
      available: 480.0,
      pending: 250.0,
      currency: 'EUR',
    };
  }
}

export const paymentsService = new PaymentsService();
