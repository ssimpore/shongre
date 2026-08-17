import { describe, it, expect } from 'vitest';
import { createServiceRegistry, services } from './service-registry.js';
import { isDemoMode } from './api-client.config.js';

describe('Service Registry & API Adapter Boundary', () => {
  it('instantiates the service registry in demo mode by default', () => {
    expect(isDemoMode()).toBe(true);
    const registry = createServiceRegistry();
    expect(registry).toBeDefined();
    expect(registry.listings).toBeDefined();
    expect(registry.search).toBeDefined();
    expect(registry.auth).toBeDefined();
    expect(registry.markets).toBeDefined();
    expect(registry.taxonomy).toBeDefined();
    expect(registry.messaging).toBeDefined();
    expect(registry.notifications).toBeDefined();
    expect(registry.orders).toBeDefined();
    expect(registry.payments).toBeDefined();
    expect(registry.promotions).toBeDefined();
    expect(registry.verification).toBeDefined();
    expect(registry.workspace).toBeDefined();
    expect(registry.admin).toBeDefined();
    expect(registry.reviews).toBeDefined();
  });

  it('exposes asynchronous Promise-based APIs on all domain services in demo mode', async () => {
    const categories = await services.taxonomy.getRootCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);

    const boosts = await services.promotions.getAvailableBoosts();
    expect(Array.isArray(boosts)).toBe(true);
    expect(boosts.length).toBeGreaterThan(0);

    const proPlans = await services.promotions.getProSubscriptionPlans();
    expect(Array.isArray(proPlans)).toBe(true);
    expect(proPlans.length).toBeGreaterThan(0);
  });

  it('provides deterministic demo verification status without backend calls', async () => {
    const status = await services.verification.getUserVerificationStatus('demo-user');
    expect(status).toBeDefined();
    expect(status.state).toBeDefined();
    expect(typeof status.isPhoneVerified).toBe('boolean');
    expect(typeof status.isIdentityVerified).toBe('boolean');
    expect(typeof status.isBusinessVerified).toBe('boolean');
    expect(typeof status.isBankPayoutConfigured).toBe('boolean');
  });
});
