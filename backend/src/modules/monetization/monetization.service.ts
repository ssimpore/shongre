import type { MonetizationOrder } from '@shongre/contracts/monetization';
import type {
  ListingBoostOption,
  ProPlan,
} from '../../infrastructure/database/repositories/monetization.repository.js';
import { AppError } from '../../shared/errors/app-error.js';
import { businessRulesService, BusinessRulesService } from '../business-rules/business-rules.service.js';

export type { ListingBoostOption, ProPlan };

const BOOST_TYPE: Record<string, ListingBoostOption['type']> = {
  'premium.urgent': 'urgent',
  'premium.search_bump': 'search_bump',
  'premium.featured': 'featured',
  'premium.featured_month': 'featured',
};
const LEGACY_PLAN_IDS: Record<string, string> = {
  'plan.pro.starter': 'starter',
  'plan.pro.business': 'pro',
  'plan.pro.enterprise': 'enterprise',
};
const CENTRAL_PRODUCT_IDS: Record<string, string> = {
  starter: 'plan.pro.starter',
  pro: 'plan.pro.business',
  enterprise: 'plan.pro.enterprise',
  boost_urgent_7d: 'premium.urgent',
  boost_bump_7d: 'premium.search_bump',
  boost_featured_7d: 'premium.highlight',
};

/** Compatibility view over the centralized catalog for existing clients. */
export class MonetizationService {
  constructor(private readonly rules: BusinessRulesService = businessRulesService) {}

  async getAvailableBoosts(_listingId?: string): Promise<ListingBoostOption[]> {
    const catalog = await this.rules.getCatalog('FR');
    return catalog.products
      .filter((product) => product.kind === 'premium_option' && product.status === 'active')
      .map((product) => {
        const price = product.prices.find((candidate) => candidate.billingPeriod === 'once') || product.prices[0];
        return {
          id: product.id,
          name: product.name,
          type: BOOST_TYPE[product.id] || 'featured',
          durationDays: price.durationDays || 1,
          price: price.amount.amountMinor / 100,
          currency: price.amount.currency,
          description: product.description,
          badgeLabel: product.name,
        };
      });
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    const catalog = await this.rules.getCatalog('FR');
    return catalog.products
      .filter((product) => product.kind === 'subscription' && product.id.startsWith('plan.pro.') && product.status === 'active')
      .map((product) => {
        const monthly = product.prices.find((price) => price.billingPeriod === 'month');
        const yearly = product.prices.find((price) => price.billingPeriod === 'year');
        const maxListings = product.entitlements.find((entry) => entry.key === 'maxActiveListings')?.value;
        return {
          id: LEGACY_PLAN_IDS[product.id] || product.id,
          name: product.name,
          priceMonthly: (monthly?.amount.amountMinor || 0) / 100,
          priceYearly: (yearly?.amount.amountMinor || 0) / 100,
          features: product.entitlements.map((entry) => `${entry.label} : ${String(entry.value)}`),
          maxListings: typeof maxListings === 'number' ? maxListings : 0,
          highlighted: product.recommended,
        };
      });
  }

  async beginProductCheckout(input: {
    accountId: string;
    productId: string;
    listingId?: string;
    idempotencyKey: string;
  }): Promise<MonetizationOrder> {
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Clé d’idempotence requise.' });
    }
    const productId = CENTRAL_PRODUCT_IDS[input.productId] || input.productId;
    const catalog = await this.rules.getCatalog('FR');
    if (!catalog.products.some((product) => product.id === productId)) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Offre commerciale introuvable.' });
    }
    const quote = await this.rules.createQuote(input.accountId, {
      productIds: [productId],
      listingId: input.listingId,
      marketCode: 'FR',
      idempotencyKey: `quote:${input.idempotencyKey}`,
    });
    return this.rules.createCheckout(input.accountId, quote.id, `checkout:${input.idempotencyKey}`);
  }
}

export const monetizationService = new MonetizationService();
