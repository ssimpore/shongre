/**
 * SHONGRE PROVIDER REPOSITORY
 * Repository contract and deterministic demo implementation with localStorage persistence.
 * Safe credentials metadata representation and zero plain secrets in frontend.
 */

import {
  Provider,
  ProviderConfiguration,
  ProviderHealthStatus,
  ProviderMarketOverride,
  ProviderAuditEvent,
  ProviderTestResult,
  EffectiveProviderResolution,
  CapabilityHealthResult,
  ProviderImpactAnalysis,
  ProviderCapability
  
} from '../domains/providers/provider.types';
import {
  CANONICAL_PROVIDER_REGISTRY,
  getProviderById,
} from '../domains/providers/provider.registry';
import { providerResolver } from '../domains/providers/provider.resolver';
import { providerValidator } from '../domains/providers/provider-validation';
import { storageService } from '../services/storage.service';
import { auditService } from '../security/audit.service';

export interface IProviderRepository {
  getProviders(): Provider[];
  getProvider(id: string): Provider | undefined;
  getConfigurations(): Record<string, ProviderConfiguration>;
  getConfiguration(providerId: string): ProviderConfiguration | null;
  saveConfiguration(
    providerId: string,
    updates: Partial<ProviderConfiguration>,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration>;
  setMarketOverride(
    providerId: string,
    marketCode: string,
    override: ProviderMarketOverride,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration>;
  resetMarketOverride(
    providerId: string,
    marketCode: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration>;
  setProviderHealth(
    providerId: string,
    health: ProviderHealthStatus,
    message?: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration>;
  testProvider(
    providerId: string,
    scenario?: 'healthy' | 'missing_credentials' | 'timeout' | 'invalid_config' | 'unsupported_market'
  ): Promise<ProviderTestResult>;
  resolveEffectiveProviders(
    capability: ProviderCapability,
    marketCode?: string
  ): EffectiveProviderResolution;
  resolveCapabilityHealth(
    capability: ProviderCapability,
    marketCode?: string
  ): CapabilityHealthResult;
  analyzeImpact(
    providerId: string,
    targetMarketCode?: string
  ): ProviderImpactAnalysis;
  getAuditHistory(providerId?: string): ProviderAuditEvent[];
}

export const INITIAL_PROVIDER_CONFIGURATIONS: Record<string, ProviderConfiguration> = {
  mangopay: {
    providerId: 'mangopay',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-10T10:00:00Z',
    credentialKeyHint: '•••• •••• •••• 4242 (Géré côté serveur)',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      clientId: 'shongre_master_eu',
      walletIdPlatform: 'wlt_shongre_escrow_master_01',
      enable3DSecureV2: true,
      sandboxMode: false,
    },
    marketOverrides: {
      BE: {
        enabled: true,
        priority: 1,
        customNotes: 'Marché Belge — Séquestre SEPA transfrontalier actif',
      },
    },
    updatedAt: '2026-08-10T10:00:00Z',
    version: 1,
  },
  stripe: {
    providerId: 'stripe',
    enabled: true,
    environment: 'demo',
    priority: 2, // Secondary for payments, primary for subscriptions
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-11T12:00:00Z',
    credentialKeyHint: 'pk_live_••••••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      publishableKey: 'pk_live_51ShongreSecuredKey2026',
    },
    marketOverrides: {},
    updatedAt: '2026-08-11T12:00:00Z',
    version: 1,
  },
  mondial_relay: {
    providerId: 'mondial_relay',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-12T14:00:00Z',
    credentialKeyHint: 'BDTEST13 (Configuré)',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      enseigneCode: 'BDTEST13',
      defaultWeightGrams: 1000,
    },
    marketOverrides: {},
    updatedAt: '2026-08-12T14:00:00Z',
    version: 1,
  },
  colissimo: {
    providerId: 'colissimo',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-12T14:00:00Z',
    credentialKeyHint: 'Contrat 999999 (Actif)',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      contractNumber: '999999',
    },
    marketOverrides: {},
    updatedAt: '2026-08-12T14:00:00Z',
    version: 1,
  },
  chronopost: {
    providerId: 'chronopost',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-12T14:00:00Z',
    credentialKeyHint: 'Compte 12345678 (Actif)',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      accountNumber: '12345678',
    },
    marketOverrides: {},
    updatedAt: '2026-08-12T14:00:00Z',
    version: 1,
  },
  cocolis: {
    providerId: 'cocolis',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-12T14:00:00Z',
    credentialKeyHint: 'App shongre_bulky_01',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      apiAppId: 'shongre_bulky_01',
    },
    marketOverrides: {},
    updatedAt: '2026-08-12T14:00:00Z',
    version: 1,
  },
  google_identity: {
    providerId: 'google_identity',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: '123456-shongre.apps.googleusercontent.com',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      clientId: '1234567890-shongre.apps.googleusercontent.com',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  apple_id: {
    providerId: 'apple_id',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'com.shongre.platform.signin',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      servicesId: 'com.shongre.platform.signin',
      teamId: 'A1B2C3D4E5',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  resend: {
    providerId: 'resend',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-05T09:00:00Z',
    credentialKeyHint: 're_••••••••••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      fromEmail: 'notifications@shongre.com',
    },
    marketOverrides: {},
    updatedAt: '2026-08-05T09:00:00Z',
    version: 1,
  },
  brevo: {
    providerId: 'brevo',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-05T09:00:00Z',
    credentialKeyHint: 'xkeysib-••••••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      defaultSenderName: 'L\'équipe Shongre',
    },
    marketOverrides: {},
    updatedAt: '2026-08-05T09:00:00Z',
    version: 1,
  },
  twilio: {
    providerId: 'twilio',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-08T11:00:00Z',
    credentialKeyHint: 'ACxxxxxxxx••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      accountSid: 'AC9876543210shongretwilioaccount',
    },
    marketOverrides: {},
    updatedAt: '2026-08-08T11:00:00Z',
    version: 1,
  },
  google_gemini: {
    providerId: 'google_gemini',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'AIzaSy••••••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      modelName: 'gemini-2.5-flash',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  openai: {
    providerId: 'openai',
    enabled: true,
    environment: 'demo',
    priority: 2,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'sk-proj-••••••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      model: 'gpt-4o-mini',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  tavily: {
    providerId: 'tavily',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'tvly-••••••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {},
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  meilisearch: {
    providerId: 'meilisearch',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'search_key_••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      hostUrl: 'https://search.shongre.internal',
      searchApiKey: 'search_key_public_2026_shongre',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  osm_nominatim: {
    providerId: 'osm_nominatim',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'not_required',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      userAgent: 'ShongrePlatform/2.0 (contact@shongre.com)',
      preferBanInFrance: true,
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  insee_sirene: {
    providerId: 'insee_sirene',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'Pappers API (Connecté)',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {},
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  veriff: {
    providerId: 'veriff',
    enabled: true,
    environment: 'sandbox',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'veriff_pub_••••••••',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      apiKey: 'veriff_pub_live_demo_01',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  cloudflare_r2: {
    providerId: 'cloudflare_r2',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'Bucket shongre-media-public',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      accountId: 'cf_acc_shongre_prod_01',
      bucketMediaName: 'shongre-media-public',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  plausible: {
    providerId: 'plausible',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'not_required',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      domain: 'shongre.com',
      scriptSource: 'https://plausible.io/js/script.js',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  sentry: {
    providerId: 'sentry',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'DSN Configuré',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      dsn: 'https://o123456@sentry.shongre.internal/1',
      tracesSampleRate: 0.1,
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  pennylane: {
    providerId: 'pennylane',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: 'Pennylane Token (Actif)',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      companyId: 'shongre_sas_01',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
  cloudflare_turnstile: {
    providerId: 'cloudflare_turnstile',
    enabled: true,
    environment: 'demo',
    priority: 1,
    credentialStatus: 'configured',
    credentialLastUpdatedAt: '2026-08-01T08:00:00Z',
    credentialKeyHint: '0x4AAAAAA•••••••• (Actif)',
    health: 'healthy',
    healthLastCheckedAt: '2026-08-17T02:00:00Z',
    settings: {
      siteKey: '0x4AAAAAAAJkL1234567890',
    },
    marketOverrides: {},
    updatedAt: '2026-08-01T08:00:00Z',
    version: 1,
  },
};

export class DemoProviderRepository implements IProviderRepository {
  private auditEvents: ProviderAuditEvent[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    const existing = storageService.get<Record<string, ProviderConfiguration> | null>(
      'shongre_provider_configs_v1',
      null
    );
    if (!existing) {
      storageService.set('shongre_provider_configs_v1', INITIAL_PROVIDER_CONFIGURATIONS);
    }
  }

  public getProviders(): Provider[] {
    return CANONICAL_PROVIDER_REGISTRY;
  }

  public getProvider(id: string): Provider | undefined {
    return getProviderById(id);
  }

  public getConfigurations(): Record<string, ProviderConfiguration> {
    return (
      storageService.get<Record<string, ProviderConfiguration>>(
        'shongre_provider_configs_v1',
        INITIAL_PROVIDER_CONFIGURATIONS
      ) || INITIAL_PROVIDER_CONFIGURATIONS
    );
  }

  public getConfiguration(providerId: string): ProviderConfiguration | null {
    const configs = this.getConfigurations();
    return configs[providerId] || null;
  }

  public async saveConfiguration(
    providerId: string,
    updates: Partial<ProviderConfiguration>,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Prestataire "${providerId}" introuvable dans le registre.`);
    }

    const configs = this.getConfigurations();
    const current = configs[providerId] || {
      providerId,
      enabled: false,
      environment: 'demo',
      priority: 1,
      credentialStatus: 'not_configured',
      health: 'unknown',
      settings: {},
      marketOverrides: {},
      updatedAt: new Date().toISOString(),
      version: 0,
    };

    const newConfig: ProviderConfiguration = {
      ...current,
      ...updates,
      providerId,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || 'Administrateur',
      version: current.version + 1,
    };

    // Validate
    const validation = providerValidator.validateConfiguration(provider, newConfig);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    configs[providerId] = newConfig;
    storageService.set('shongre_provider_configs_v1', configs);

    // Audit log
    this.recordAuditEvent({
      actorId: actor?.id || 'admin-1',
      actorName: actor?.name || 'Administrateur',
      actorRole: actor?.role || 'admin',
      providerId,
      providerName: provider.name,
      action: updates.enabled !== undefined && updates.enabled !== current.enabled
        ? updates.enabled ? 'enabled' : 'disabled'
        : 'configured',
      details: `Configuration mise à jour pour ${provider.name} (v${newConfig.version}).`,
      previousValue: current,
      newValue: newConfig,
    });

    return newConfig;
  }

  public async setMarketOverride(
    providerId: string,
    marketCode: string,
    override: ProviderMarketOverride,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Prestataire "${providerId}" introuvable.`);

    const normMarket = marketCode.toUpperCase();
    const validation = providerValidator.validateMarketOverride(provider, normMarket, override);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    const configs = this.getConfigurations();
    const current = configs[providerId];
    if (!current) throw new Error(`Configuration introuvable pour "${providerId}".`);

    const updatedOverrides = {
      ...current.marketOverrides,
      [normMarket]: {
        ...override,
        updatedAt: new Date().toISOString(),
        updatedBy: actor?.name || 'Administrateur',
      },
    };

    const newConfig: ProviderConfiguration = {
      ...current,
      marketOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || 'Administrateur',
      version: current.version + 1,
    };

    configs[providerId] = newConfig;
    storageService.set('shongre_provider_configs_v1', configs);

    this.recordAuditEvent({
      actorId: actor?.id || 'admin-1',
      actorName: actor?.name || 'Administrateur',
      actorRole: actor?.role || 'admin',
      providerId,
      providerName: provider.name,
      action: 'market_override_set',
      marketCode: normMarket,
      details: `Surcharge de marché configurée pour ${normMarket} sur ${provider.name}.`,
    });

    return newConfig;
  }

  public async resetMarketOverride(
    providerId: string,
    marketCode: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Prestataire "${providerId}" introuvable.`);

    const normMarket = marketCode.toUpperCase();
    const configs = this.getConfigurations();
    const current = configs[providerId];
    if (!current) throw new Error(`Configuration introuvable pour "${providerId}".`);

    const updatedOverrides = { ...current.marketOverrides };
    delete updatedOverrides[normMarket];

    const newConfig: ProviderConfiguration = {
      ...current,
      marketOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || 'Administrateur',
      version: current.version + 1,
    };

    configs[providerId] = newConfig;
    storageService.set('shongre_provider_configs_v1', configs);

    this.recordAuditEvent({
      actorId: actor?.id || 'admin-1',
      actorName: actor?.name || 'Administrateur',
      actorRole: actor?.role || 'admin',
      providerId,
      providerName: provider.name,
      action: 'market_override_reset',
      marketCode: normMarket,
      details: `Surcharge réinitialisée pour ${normMarket} sur ${provider.name} (hérite désormais de la France).`,
    });

    return newConfig;
  }

  public async setProviderHealth(
    providerId: string,
    health: ProviderHealthStatus,
    message?: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<ProviderConfiguration> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Prestataire "${providerId}" introuvable.`);

    const configs = this.getConfigurations();
    const current = configs[providerId];
    if (!current) throw new Error(`Configuration introuvable pour "${providerId}".`);

    const newConfig: ProviderConfiguration = {
      ...current,
      health,
      healthMessage: message,
      healthLastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    configs[providerId] = newConfig;
    storageService.set('shongre_provider_configs_v1', configs);

    this.recordAuditEvent({
      actorId: actor?.id || 'admin-1',
      actorName: actor?.name || 'Administrateur',
      actorRole: actor?.role || 'admin',
      providerId,
      providerName: provider.name,
      action: 'health_simulated',
      details: `État de santé simulé : ${health} ${message ? `(${message})` : ''}`,
    });

    return newConfig;
  }

  public async testProvider(
    providerId: string,
    scenario: 'healthy' | 'missing_credentials' | 'timeout' | 'invalid_config' | 'unsupported_market' = 'healthy'
  ): Promise<ProviderTestResult> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return {
        providerId,
        success: false,
        scenario,
        latencyMs: 15,
        message: `Prestataire ${providerId} introuvable.`,
        testedAt: new Date().toISOString(),
        diagnostics: { error: 'PROVIDER_NOT_FOUND' },
      };
    }

    // Deterministic simulation
    await new Promise((resolve) => setTimeout(resolve, 400));

    const config = this.getConfiguration(providerId);

    if (scenario === 'missing_credentials' || config?.credentialStatus === 'not_configured') {
      return {
        providerId,
        success: false,
        scenario: 'missing_credentials',
        latencyMs: 120,
        message: 'Échec du test : Identifiants ou clé secrète serveur non configurés.',
        testedAt: new Date().toISOString(),
        diagnostics: {
          code: 'PROVIDER_CREDENTIALS_MISSING',
          credentialStatus: config?.credentialStatus || 'not_configured',
        },
      };
    }

    if (scenario === 'timeout') {
      return {
        providerId,
        success: false,
        scenario: 'timeout',
        latencyMs: 5000,
        message: 'Échec du test : Délai d\'attente dépassé (HTTP 504 Gateway Timeout).',
        testedAt: new Date().toISOString(),
        diagnostics: {
          code: 'PROVIDER_TIMEOUT',
          endpoint: provider.metadata.website || 'api.provider.internal',
        },
      };
    }

    if (scenario === 'invalid_config') {
      return {
        providerId,
        success: false,
        scenario: 'invalid_config',
        latencyMs: 180,
        message: 'Échec du test : Paramètres de configuration rejetés par l\'API partenaire.',
        testedAt: new Date().toISOString(),
        diagnostics: {
          code: 'PROVIDER_CONFIGURATION_INVALID',
        },
      };
    }

    return {
      providerId,
      success: true,
      scenario: 'healthy',
      latencyMs: 85,
      message: `Connexion au prestataire ${provider.name} établie avec succès. Tous les endpoints répondent normalement.`,
      testedAt: new Date().toISOString(),
      diagnostics: {
        code: 'OK',
        environment: config?.environment || 'demo',
        capabilitiesVerified: provider.capabilities,
        protocol: 'HTTPS / TLS 1.3',
      },
    };
  }

  public resolveEffectiveProviders(
    capability: ProviderCapability,
    marketCode = 'FR'
  ): EffectiveProviderResolution {
    const configs = this.getConfigurations();
    return providerResolver.resolveEffectiveProviders({
      capability,
      marketCode,
      configurations: configs,
    });
  }

  public resolveCapabilityHealth(
    capability: ProviderCapability,
    marketCode = 'FR'
  ): CapabilityHealthResult {
    const configs = this.getConfigurations();
    return providerResolver.resolveCapabilityHealth({
      capability,
      marketCode,
      configurations: configs,
    });
  }

  public analyzeImpact(
    providerId: string,
    targetMarketCode = 'FR'
  ): ProviderImpactAnalysis {
    const configs = this.getConfigurations();
    return providerResolver.analyzeProviderImpact({
      providerId,
      configurations: configs,
      targetMarketCode,
    });
  }

  public getAuditHistory(providerId?: string): ProviderAuditEvent[] {
    const stored = storageService.get<ProviderAuditEvent[]>('shongre_provider_audit_logs_v1', []);
    const merged = [...stored, ...this.auditEvents];
    if (providerId) {
      return merged.filter((e) => e.providerId === providerId);
    }
    return merged;
  }

  private recordAuditEvent(event: Omit<ProviderAuditEvent, 'id' | 'timestamp'>): void {
    const newEvent: ProviderAuditEvent = {
      ...event,
      id: `p-aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditEvents.unshift(newEvent);

    const stored = storageService.get<ProviderAuditEvent[]>('shongre_provider_audit_logs_v1', []);
    stored.unshift(newEvent);
    storageService.set('shongre_provider_audit_logs_v1', stored.slice(0, 100)); // Keep last 100

    // Also bridge to security audit log
    auditService.logEvent({
      actorId: event.actorId,
      actorName: event.actorName,
      actorRole: event.actorRole,
      targetId: event.providerId,
      targetName: event.providerName,
      action: 'provider_configured',
      details: event.details,
    });
  }
}

export const providerRepository: IProviderRepository = new DemoProviderRepository();
