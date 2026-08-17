import { describe, it, expect } from 'vitest';
import {
  validateBusinessIdentifier,
  formatBusinessIdentifier,
  getMarketDefinition,
  SUPPORTED_MARKETS,
} from './market.config';

describe('Market Config - Business Identifier Validation & Formatting', () => {
  it('validates French SIRET (14 digits) and SIREN (9 digits)', () => {
    // Valid SIREN
    expect(validateBusinessIdentifier('123456789', 'FR')).toBe(true);
    // Valid SIRET with formatting
    expect(validateBusinessIdentifier('802 954 785 00028', 'FR')).toBe(true);
    // Invalid length or characters
    expect(validateBusinessIdentifier('12345', 'FR')).toBe(false);
    expect(validateBusinessIdentifier('ABC123456', 'FR')).toBe(false);
  });

  it('formats French SIRET with standard space grouping', () => {
    const formatted = formatBusinessIdentifier('80295478500028', 'FR');
    expect(formatted).toBe('802 954 785 00028');
  });

  it('validates and formats Belgian BCE numbers', () => {
    expect(validateBusinessIdentifier('0849204892', 'BE')).toBe(true);
    expect(validateBusinessIdentifier('BE0849204892', 'BE')).toBe(true);
    const formatted = formatBusinessIdentifier('0849204892', 'BE');
    expect(formatted).toBe('0849.204.892');
  });

  it('returns default French market definition with currency EUR', () => {
    const market = getMarketDefinition('FR');
    expect(market.code).toBe('FR');
    expect(market.currency).toBe('EUR');
    expect(market.isDefault).toBe(true);
    expect(market.supportedLegalForms.length).toBeGreaterThan(0);
  });

  it('returns Swiss market definition with currency CHF', () => {
    const market = getMarketDefinition('CH');
    expect(market.code).toBe('CH');
    expect(market.currency).toBe('CHF');
    expect(market.currencySymbol).toBe('CHF');
    expect(market.vatRateStandard).toBe(0.081);
  });

  it('provides proxy access via SUPPORTED_MARKETS dictionary', () => {
    expect(SUPPORTED_MARKETS.FR.name).toBe('France');
    expect(SUPPORTED_MARKETS.BE.name).toBe('Belgique');
    expect(SUPPORTED_MARKETS.CH.name).toBe('Suisse');
  });
});
