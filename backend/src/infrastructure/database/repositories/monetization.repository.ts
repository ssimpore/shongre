import { BASELINE_MONETIZATION_CATALOG } from '@shongre/contracts/monetization-catalog';
import { AppError } from '../../../shared/errors/app-error.js';

export interface ListingBoostOption {
  id: string;
  name: string;
  type: 'urgent' | 'search_bump' | 'featured';
  durationDays: number;
  price: number;
  currency: string;
  description: string;
  badgeLabel?: string;
  multiplierText?: string;
}

export interface ProPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  maxListings: number;
  highlighted?: boolean;
}

export const CANONICAL_DEMO_BOOSTS: ListingBoostOption[] =
  BASELINE_MONETIZATION_CATALOG.products
    .filter((product) => product.kind === 'premium_option')
    .map((product) => {
      const price = product.prices[0];
      return {
        id: product.id,
        name: product.name,
        type: product.id.includes('urgent')
          ? 'urgent'
          : product.id.includes('bump')
            ? 'search_bump'
            : 'featured',
        durationDays: price.durationDays || 1,
        price: price.amount.amountMinor / 100,
        currency: price.amount.currency,
        description: product.description,
        badgeLabel: product.name,
      };
    });

export const CANONICAL_DEMO_PRO_PLANS: ProPlan[] =
  BASELINE_MONETIZATION_CATALOG.products
    .filter((product) => product.id.startsWith('plan.pro.'))
    .map((product) => {
      const monthly = product.prices.find((price) => price.billingPeriod === 'month');
      const yearly = product.prices.find((price) => price.billingPeriod === 'year');
      const maxListings = product.entitlements.find((entry) => entry.key === 'maxActiveListings')?.value;
      return {
        id:
          product.id === 'plan.pro.starter'
            ? 'starter'
            : product.id === 'plan.pro.business'
              ? 'pro'
              : 'enterprise',
        name: product.name,
        priceMonthly: (monthly?.amount.amountMinor || 0) / 100,
        priceYearly: (yearly?.amount.amountMinor || 0) / 100,
        maxListings: typeof maxListings === 'number' ? maxListings : 0,
        highlighted: product.recommended,
        features: product.entitlements.map((entry) => `${entry.label} : ${String(entry.value)}`),
      };
    });

export interface IMonetizationRepository {
  getBoosts(listingId?: string): Promise<ListingBoostOption[]>;
  getPlans(): Promise<ProPlan[]>;
  applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }>;
  subscribe(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }>;
}

export class DemoMonetizationRepository implements IMonetizationRepository {
  async getBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    return CANONICAL_DEMO_BOOSTS;
  }

  async getPlans(): Promise<ProPlan[]> {
    return CANONICAL_DEMO_PRO_PLANS;
  }

  async applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }> {
    void listingId; void boostId; void paymentMethod;
    throw new AppError({ code: 'CONFLICT', message: 'Créez un devis commercial puis un checkout.' });
  }

  async subscribe(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }> {
    void sellerId; void planId;
    throw new AppError({ code: 'CONFLICT', message: 'Créez un devis commercial puis un checkout.' });
  }
}

export class PostgresMonetizationRepository implements IMonetizationRepository {
  async getBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    return CANONICAL_DEMO_BOOSTS;
  }

  async getPlans(): Promise<ProPlan[]> {
    return CANONICAL_DEMO_PRO_PLANS;
  }

  async applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }> {
    void listingId; void boostId; void paymentMethod;
    throw new AppError({ code: 'CONFLICT', message: 'Créez un devis commercial puis un checkout.' });
  }

  async subscribe(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }> {
    void sellerId; void planId;
    throw new AppError({ code: 'CONFLICT', message: 'Créez un devis commercial puis un checkout.' });
  }
}
