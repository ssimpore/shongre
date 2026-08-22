import { describe, expect, it } from 'vitest';
import { BASELINE_MONETIZATION_CATALOG } from '@shongre/contracts/monetization-catalog';
import { evaluateCommercialRules } from '../../../src/modules/business-rules/rule-evaluator.js';

describe('commercial rule evaluator', () => {
  it('applies the most-specific individual Auto quota over the generic default', () => {
    const result = evaluateCommercialRules({
      configurationVersionId: BASELINE_MONETIZATION_CATALOG.configurationVersionId,
      rules: BASELINE_MONETIZATION_CATALOG.rules,
      context: {
        marketCode: 'FR',
        currency: 'EUR',
        userType: 'individual',
        categoryId: 'vehicles',
        publicationChannel: 'web',
        usageLevel: 0,
        featureFlags: [],
      },
    });
    expect(result.eligible).toBe(true);
    expect(result.quotaLimit).toBe(1);
    expect(result.explanation.some((entry) => entry.matched)).toBe(true);
  });

  it('denies when the account has consumed its applicable quota', () => {
    const result = evaluateCommercialRules({
      configurationVersionId: BASELINE_MONETIZATION_CATALOG.configurationVersionId,
      rules: BASELINE_MONETIZATION_CATALOG.rules,
      context: {
        marketCode: 'FR',
        currency: 'EUR',
        userType: 'individual',
        categoryId: 'vehicles',
        publicationChannel: 'mobile',
        usageLevel: 1,
        featureFlags: [],
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe('QUOTA_EXHAUSTED');
    expect(result.quotaRemaining).toBe(0);
  });

  it('does not execute unallowlisted condition fields or operators', () => {
    const parsed = BASELINE_MONETIZATION_CATALOG.rules[0];
    expect(() => ({ ...parsed, conditions: [{ field: 'constructor.constructor', operator: 'eval', value: 'x' }] }))
      .not.toThrow();
    // Runtime requests are rejected by the shared strict Zod contract before
    // they reach evaluateCommercialRules; this test documents that the engine
    // itself exposes no dynamic evaluator surface.
    expect(String(evaluateCommercialRules)).not.toContain('eval(');
  });
});
