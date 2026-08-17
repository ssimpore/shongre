import { describe, it, expect, beforeEach } from 'vitest';
import { providerService } from './provider.service';
import { DemoProviderRepository } from '../../repositories/provider.repository';

describe('Provider Service High-Level Operations', () => {
  let service: typeof providerService;

  beforeEach(() => {
    service = providerService;
  });

  it('retrieves all supported providers and configurations', () => {
    const providers = service.getProviders();
    expect(providers.length).toBeGreaterThan(15);

    const configs = service.getConfigurations();
    expect(configs.mangopay).toBeDefined();
    expect(configs.mondial_relay).toBeDefined();
    expect(configs.google_gemini).toBeDefined();
  });

  it('allows saving provider configuration and incrementing version', async () => {
    const current = service.getConfiguration('mondial_relay');
    const prevVersion = current?.version || 1;

    const updated = await service.saveConfiguration('mondial_relay', {
      settings: {
        ...current?.settings,
        defaultWeightGrams: 1500,
      },
    });

    expect(updated.version).toBe(prevVersion + 1);
    expect(updated.settings.defaultWeightGrams).toBe(1500);
  });

  it('supports configuring and resetting market overrides', async () => {
    // 1. Set override on Belgium
    const withOverride = await service.setMarketOverride('mondial_relay', 'BE', {
      enabled: true,
      priority: 1,
      customNotes: 'Test override Belgique',
    });

    expect(withOverride.marketOverrides.BE).toBeDefined();
    expect(withOverride.marketOverrides.BE.customNotes).toBe('Test override Belgique');

    // 2. Reset override on Belgium
    const reset = await service.resetMarketOverride('mondial_relay', 'BE');
    expect(reset.marketOverrides.BE).toBeUndefined();
  });

  it('simulates provider health transitions', async () => {
    const degraded = await service.setProviderHealth(
      'google_gemini',
      'degraded',
      'High latency detected'
    );
    expect(degraded.health).toBe('degraded');
    expect(degraded.healthMessage).toBe('High latency detected');

    const healthy = await service.setProviderHealth('google_gemini', 'healthy');
    expect(healthy.health).toBe('healthy');
  });

  it('runs deterministic test scenarios accurately', async () => {
    const successResult = await service.testProvider('mangopay', 'healthy');
    expect(successResult.success).toBe(true);
    expect(successResult.diagnostics.code).toBe('OK');

    const missingCredsResult = await service.testProvider('mangopay', 'missing_credentials');
    expect(missingCredsResult.success).toBe(false);
    expect(missingCredsResult.diagnostics.code).toBe('PROVIDER_CREDENTIALS_MISSING');

    const timeoutResult = await service.testProvider('mangopay', 'timeout');
    expect(timeoutResult.success).toBe(false);
    expect(timeoutResult.diagnostics.code).toBe('PROVIDER_TIMEOUT');
  });

  it('generates cross-market coverage matrix rows', () => {
    const matrix = service.getMarketCoverageMatrix(['FR', 'BE', 'CH', 'ES']);
    expect(matrix.length).toBeGreaterThan(10);

    const paymentRow = matrix.find((r) => r.capability === 'payment.card');
    expect(paymentRow).toBeDefined();
    expect(paymentRow?.markets.FR.activeProviderName).toBeTruthy();
    // Switzerland inherits France
    expect(paymentRow?.markets.CH.isInherited).toBe(true);
    // Belgium has an explicit market override in initial config
    expect(paymentRow?.markets.BE.isInherited).toBe(false);

    const relayRow = matrix.find((r) => r.capability === 'delivery.relay_point');
    expect(relayRow).toBeDefined();
    // Mondial relay in Belgium inherits France
    expect(relayRow?.markets.BE.isInherited).toBe(true);
  });
});
