import { CountryMarketDefinition, DeliveryType } from '../../../shared/types/index.js';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

export interface IMarketRepository {
  getAll(): Promise<CountryMarketDefinition[]>;
  getByCode(code: string): Promise<CountryMarketDefinition | null>;
  getActive(): Promise<CountryMarketDefinition>;
  setActive(code: string): Promise<CountryMarketDefinition>;
  getEffective(code: string): Promise<CountryMarketDefinition>;
}

export const CANONICAL_DEMO_MARKETS: Record<string, CountryMarketDefinition> = {
  FR: {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'fr-FR',
    protectionFeeRate: 0.04,
    protectionFixedFee: 0.7,
    freeListingsLimit: 10,
    allowedDeliveryMethods: ['hand_delivery', 'relay_point', 'home_delivery'],
    isBaseMarket: true,
    isActive: true,
  },
  BE: {
    code: 'BE',
    name: 'Belgique',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'fr-BE',
    protectionFeeRate: 0.045,
    protectionFixedFee: 0.8,
    freeListingsLimit: 10,
    allowedDeliveryMethods: ['hand_delivery', 'relay_point', 'home_delivery'],
    isBaseMarket: false,
    isActive: true,
  },
  CH: {
    code: 'CH',
    name: 'Suisse',
    currency: 'CHF',
    currencySymbol: 'CHF',
    locale: 'fr-CH',
    protectionFeeRate: 0.035,
    protectionFixedFee: 1.0,
    freeListingsLimit: 5,
    allowedDeliveryMethods: ['hand_delivery', 'home_delivery'],
    isBaseMarket: false,
    isActive: true,
  },
  LU: {
    code: 'LU',
    name: 'Luxembourg',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'fr-LU',
    protectionFeeRate: 0.04,
    protectionFixedFee: 0.7,
    freeListingsLimit: 10,
    allowedDeliveryMethods: ['hand_delivery', 'relay_point', 'home_delivery'],
    isBaseMarket: false,
    isActive: true,
  },
  DE: {
    code: 'DE',
    name: 'Allemagne',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'de-DE',
    protectionFeeRate: 0.04,
    protectionFixedFee: 0.7,
    freeListingsLimit: 10,
    allowedDeliveryMethods: ['hand_delivery', 'relay_point', 'home_delivery'],
    isBaseMarket: false,
    isActive: true,
  },
  ES: {
    code: 'ES',
    name: 'Espagne',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'es-ES',
    protectionFeeRate: 0.045,
    protectionFixedFee: 0.7,
    freeListingsLimit: 10,
    allowedDeliveryMethods: ['hand_delivery', 'relay_point', 'home_delivery'],
    isBaseMarket: false,
    isActive: true,
  },
};

export class DemoMarketRepository implements IMarketRepository {
  private markets: Map<string, CountryMarketDefinition> = new Map();
  private activeCode = 'FR';

  constructor(initialMarkets: Record<string, CountryMarketDefinition> = CANONICAL_DEMO_MARKETS) {
    this.reset(initialMarkets);
  }

  reset(initialMarkets: Record<string, CountryMarketDefinition> = CANONICAL_DEMO_MARKETS) {
    this.markets.clear();
    Object.values(initialMarkets).forEach((m) => this.markets.set(m.code, { ...m }));
    this.activeCode = 'FR';
  }

  async getAll(): Promise<CountryMarketDefinition[]> {
    return Array.from(this.markets.values()).map((m) => ({ ...m }));
  }

  async getByCode(code: string): Promise<CountryMarketDefinition | null> {
    const upper = (code || '').toUpperCase();
    const market = this.markets.get(upper);
    return market ? { ...market } : null;
  }

  async getActive(): Promise<CountryMarketDefinition> {
    return this.getEffective(this.activeCode);
  }

  async setActive(code: string): Promise<CountryMarketDefinition> {
    const effective = await this.getEffective(code);
    this.activeCode = effective.code;
    return effective;
  }

  async getEffective(code: string): Promise<CountryMarketDefinition> {
    const baseMarket = this.markets.get('FR') || CANONICAL_DEMO_MARKETS.FR;
    const targetCode = (code || 'FR').toUpperCase();
    const targetMarket = this.markets.get(targetCode);

    if (!targetMarket) {
      return { ...baseMarket };
    }

    return {
      code: targetMarket.code ?? baseMarket.code,
      name: targetMarket.name ?? baseMarket.name,
      currency: targetMarket.currency ?? baseMarket.currency,
      currencySymbol: targetMarket.currencySymbol ?? baseMarket.currencySymbol,
      locale: targetMarket.locale ?? baseMarket.locale,
      protectionFeeRate:
        typeof targetMarket.protectionFeeRate === 'number'
          ? targetMarket.protectionFeeRate
          : baseMarket.protectionFeeRate,
      protectionFixedFee:
        typeof targetMarket.protectionFixedFee === 'number'
          ? targetMarket.protectionFixedFee
          : baseMarket.protectionFixedFee,
      freeListingsLimit:
        typeof targetMarket.freeListingsLimit === 'number'
          ? targetMarket.freeListingsLimit
          : baseMarket.freeListingsLimit,
      allowedDeliveryMethods:
        targetMarket.allowedDeliveryMethods?.length > 0
          ? [...targetMarket.allowedDeliveryMethods]
          : [...baseMarket.allowedDeliveryMethods],
      isBaseMarket: targetMarket.isBaseMarket ?? false,
      isActive: targetMarket.isActive ?? baseMarket.isActive,
    };
  }
}

export class PostgresMarketRepository implements IMarketRepository {
  private activeCode = 'FR';

  private mapRowToMarket(row: any): CountryMarketDefinition {
    return {
      code: row.code,
      name: row.name,
      currency: row.currency,
      currencySymbol: row.currency_symbol || '€',
      locale: row.locale,
      protectionFeeRate: Number(row.protection_fee_rate || 0.04),
      protectionFixedFee: Number(row.protection_fixed_fee || 0.7),
      freeListingsLimit: Number(row.free_listings_limit || 10),
      allowedDeliveryMethods: (row.allowed_delivery_methods as DeliveryType[]) || ['hand_delivery', 'relay_point', 'home_delivery'],
      isBaseMarket: Boolean(row.is_base_market),
      isActive: Boolean(row.is_active),
    };
  }

  async getAll(): Promise<CountryMarketDefinition[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.from('markets').select('*').order('code');
      if (error || !data || data.length === 0) {
        return Object.values(CANONICAL_DEMO_MARKETS);
      }
      return data.map((r: any) => this.mapRowToMarket(r));
    } catch (err: any) {
      logger.error(`PostgresMarketRepository.getAll error: ${err.message}`);
      return Object.values(CANONICAL_DEMO_MARKETS);
    }
  }

  async getByCode(code: string): Promise<CountryMarketDefinition | null> {
    const upper = (code || '').toUpperCase();
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.from('markets').select('*').eq('code', upper).single();
      if (error || !data) return null;
      return this.mapRowToMarket(data);
    } catch {
      return null;
    }
  }

  async getActive(): Promise<CountryMarketDefinition> {
    return this.getEffective(this.activeCode);
  }

  async setActive(code: string): Promise<CountryMarketDefinition> {
    const effective = await this.getEffective(code);
    this.activeCode = effective.code;
    return effective;
  }

  async getEffective(code: string): Promise<CountryMarketDefinition> {
    const all = await this.getAll();
    const base = all.find((m) => m.code === 'FR') || CANONICAL_DEMO_MARKETS.FR;
    const target = all.find((m) => m.code === (code || 'FR').toUpperCase());

    if (!target) return { ...base };

    return {
      code: target.code ?? base.code,
      name: target.name ?? base.name,
      currency: target.currency ?? base.currency,
      currencySymbol: target.currencySymbol ?? base.currencySymbol,
      locale: target.locale ?? base.locale,
      protectionFeeRate:
        typeof target.protectionFeeRate === 'number'
          ? target.protectionFeeRate
          : base.protectionFeeRate,
      protectionFixedFee:
        typeof target.protectionFixedFee === 'number'
          ? target.protectionFixedFee
          : base.protectionFixedFee,
      freeListingsLimit:
        typeof target.freeListingsLimit === 'number'
          ? target.freeListingsLimit
          : base.freeListingsLimit,
      allowedDeliveryMethods:
        target.allowedDeliveryMethods?.length > 0
          ? [...target.allowedDeliveryMethods]
          : [...base.allowedDeliveryMethods],
      isBaseMarket: target.isBaseMarket ?? false,
      isActive: target.isActive ?? base.isActive,
    };
  }
}
