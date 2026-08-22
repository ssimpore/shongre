import { describe, it, expect } from 'vitest';
import { monetizationService, CANONICAL_BOOSTS, CANONICAL_PRO_PLANS } from '../../src/modules/monetization/monetization.service.js';

describe('Monetization & Subscriptions', () => {
  it('provides the complete canonical boost options', async () => {
    const boosts = await monetizationService.getAvailableBoosts();
    expect(boosts.length).toBeGreaterThanOrEqual(4);
    expect(boosts.some((b) => b.type === 'urgent')).toBe(true);
    expect(boosts.some((b) => b.type === 'search_bump')).toBe(true);
    expect(boosts.some((b) => b.type === 'featured')).toBe(true);
  });

  it('provides the 3 pro plans (Starter, Pro, Enterprise)', async () => {
    const plans = await monetizationService.getProSubscriptionPlans();
    expect(plans.length).toBe(3);
    const planIds = plans.map((p) => p.id);
    expect(planIds).toContain('starter');
    expect(planIds).toContain('pro');
    expect(planIds).toContain('enterprise');
  });

  it('routes a legacy boost id through the authoritative quote checkout', async () => {
    const order = await monetizationService.beginProductCheckout({
      accountId: 'individual_legacy_boost_test',
      listingId: 'list_1',
      productId: 'boost_urgent_7d',
      idempotencyKey: 'legacy-boost-checkout-01',
    });
    expect(order.status).toBe('paid');
    expect(order.quoteId).toMatch(/^quote_/);
  });
});
