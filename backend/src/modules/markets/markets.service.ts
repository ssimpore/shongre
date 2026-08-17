import { CountryMarketDefinition, DeliveryType } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';

export const CANONICAL_MARKETS: Record<string, CountryMarketDefinition> = {
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

export class MarketsService {
  private activeMarketCode = 'FR';

  async getAllMarkets(): Promise<CountryMarketDefinition[]> {
    return Object.values(CANONICAL_MARKETS);
  }

  async getMarketByCode(code: string): Promise<CountryMarketDefinition | null> {
    const upper = (code || '').toUpperCase();
    return CANONICAL_MARKETS[upper] || null;
  }

  async getActiveMarket(): Promise<CountryMarketDefinition> {
    return this.getEffectiveMarketConfig(this.activeMarketCode);
  }

  async setActiveMarket(code: string): Promise<CountryMarketDefinition> {
    const market = await this.getEffectiveMarketConfig(code);
    this.activeMarketCode = market.code;
    return market;
  }

  /**
   * Resolves effective market configuration with France baseline inheritance.
   * Uses explicit null/undefined checks so 0 or false overrides are preserved.
   */
  async getEffectiveMarketConfig(code: string): Promise<CountryMarketDefinition> {
    const baseMarket = CANONICAL_MARKETS.FR;
    const targetCode = (code || 'FR').toUpperCase();
    const targetMarket = CANONICAL_MARKETS[targetCode];

    if (!targetMarket) {
      return baseMarket;
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
          ? targetMarket.allowedDeliveryMethods
          : baseMarket.allowedDeliveryMethods,
      isBaseMarket: targetMarket.isBaseMarket ?? false,
      isActive: targetMarket.isActive ?? baseMarket.isActive,
    };
  }
}

export const marketsService = new MarketsService();
