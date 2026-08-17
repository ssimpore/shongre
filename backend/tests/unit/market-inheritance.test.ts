import { describe, it, expect } from 'vitest';
import { marketsService, CANONICAL_MARKETS } from '../../src/modules/markets/markets.service.js';

describe('Multi-Market Inheritance Engine', () => {
  it('returns France as the base market configuration', async () => {
    const fr = await marketsService.getEffectiveMarketConfig('FR');
    expect(fr.code).toBe('FR');
    expect(fr.currency).toBe('EUR');
    expect(fr.isBaseMarket).toBe(true);
    expect(fr.protectionFeeRate).toBe(0.04);
    expect(fr.protectionFixedFee).toBe(0.7);
  });

  it('correctly resolves Belgian market overrides', async () => {
    const be = await marketsService.getEffectiveMarketConfig('BE');
    expect(be.code).toBe('BE');
    expect(be.protectionFeeRate).toBe(0.045);
    expect(be.protectionFixedFee).toBe(0.8);
    expect(be.currency).toBe('EUR');
    expect(be.isBaseMarket).toBe(false);
  });

  it('correctly falls back to France if market code is unknown', async () => {
    const unknown = await marketsService.getEffectiveMarketConfig('XX');
    expect(unknown.code).toBe('FR');
    expect(unknown.currency).toBe('EUR');
  });

  it('handles case-insensitivity on market codes', async () => {
    const ch = await marketsService.getEffectiveMarketConfig('ch');
    expect(ch.code).toBe('CH');
    expect(ch.currency).toBe('CHF');
    expect(ch.protectionFeeRate).toBe(0.035);
  });
});
