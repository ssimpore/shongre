import { stripeAdapter, StripePaymentIntentParams } from '../../infrastructure/payments/stripe-adapter.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface PaymentIntentResult {
  clientSecret: string;
  status: 'succeeded' | 'requires_action' | 'pending' | 'failed';
  amount: number;
  currency: string;
}

export interface IPaymentProvider {
  createPaymentIntent(amount: number, currency?: string, metadata?: Record<string, string>): Promise<PaymentIntentResult>;
  requestPayout(sellerId: string, amount: number, iban: string): Promise<{ payoutId: string; status: 'completed' | 'processing' }>;
  getBalance(sellerId: string): Promise<{ available: number; pending: number; currency: string }>;
}

export class DemoPaymentProvider implements IPaymentProvider {
  async createPaymentIntent(amount: number, currency = 'EUR', metadata?: Record<string, string>): Promise<PaymentIntentResult> {
    const id = `pi_demo_${Math.random().toString(36).substring(2, 10)}`;
    return {
      clientSecret: `${id}_secret_demo`,
      status: 'requires_action',
      amount,
      currency: currency.toLowerCase(),
    };
  }

  async requestPayout(sellerId: string, amount: number, iban: string): Promise<{ payoutId: string; status: 'completed' | 'processing' }> {
    return {
      payoutId: `po_demo_${Math.random().toString(36).substring(2, 10)}`,
      status: 'processing',
    };
  }

  async getBalance(sellerId: string): Promise<{ available: number; pending: number; currency: string }> {
    return {
      available: 480.0,
      pending: 250.0,
      currency: 'EUR',
    };
  }
}

export class StripePaymentProvider implements IPaymentProvider {
  async createPaymentIntent(amount: number, currency = 'EUR', metadata?: Record<string, string>): Promise<PaymentIntentResult> {
    const res = await stripeAdapter.createPaymentIntent({
      amount,
      currency,
      metadata,
    });
    return {
      clientSecret: res.clientSecret,
      status: res.status,
      amount: res.amount,
      currency: res.currency,
    };
  }

  async requestPayout(sellerId: string, amount: number, iban: string): Promise<{ payoutId: string; status: 'completed' | 'processing' }> {
    return stripeAdapter.createPayout(sellerId, amount, iban);
  }

  async getBalance(sellerId: string): Promise<{ available: number; pending: number; currency: string }> {
    return {
      available: 480.0,
      pending: 250.0,
      currency: 'EUR',
    };
  }
}
