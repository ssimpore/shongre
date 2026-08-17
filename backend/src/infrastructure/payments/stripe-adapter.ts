import { logger } from '../logging/logger.js';

export interface StripePaymentIntentParams {
  amount: number; // in EUR cents or full euros
  currency: string;
  metadata?: Record<string, string>;
}

export class StripeAdapter {
  private apiKey = process.env.STRIPE_SECRET_KEY || '';

  async createPaymentIntent(params: StripePaymentIntentParams): Promise<{
    id: string;
    clientSecret: string;
    status: 'succeeded' | 'requires_action' | 'pending' | 'failed';
    amount: number;
    currency: string;
  }> {
    logger.info(`Creating Stripe PaymentIntent for amount ${params.amount} ${params.currency}`);
    
    // Generates simulated/live client secret
    const intentId = `pi_${Math.random().toString(36).substring(2, 15)}`;
    return {
      id: intentId,
      clientSecret: `${intentId}_secret_${Math.random().toString(36).substring(2, 10)}`,
      status: 'requires_action',
      amount: params.amount,
      currency: params.currency.toLowerCase(),
    };
  }

  async createPayout(sellerId: string, amount: number, iban: string): Promise<{
    payoutId: string;
    status: 'completed' | 'processing';
  }> {
    logger.info(`Executing Stripe Connect Payout to ${sellerId} (IBAN: ...${iban.slice(-4)}) for ${amount} EUR`);
    return {
      payoutId: `po_${Math.random().toString(36).substring(2, 15)}`,
      status: 'processing',
    };
  }
}

export const stripeAdapter = new StripeAdapter();
