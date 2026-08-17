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

  it('calculates boost expiry duration accurately', async () => {
    const res = await monetizationService.applyBoost('list_1', 'boost_urgent_7d', 'card');
    expect(res.success).toBe(true);
    const expiry = new Date(res.expiresAt).getTime();
    const now = Date.now();
    const diffDays = Math.round((expiry - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });
});
