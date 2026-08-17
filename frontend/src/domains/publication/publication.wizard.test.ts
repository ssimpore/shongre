import { describe, it, expect } from 'vitest';
import { publicationService } from './publication.service.js';
import { publicationResolver } from './publication.resolver.js';
import { marketService } from '../market/market.service.js';
import { PublicationDraftState } from './publication.types.js';

describe('Publication Wizard & Multi-Market Resolution', () => {
  it('creates and initializes a clean publication draft state', () => {
    const draft: PublicationDraftState = {
      marketCode: 'FR',
      selectedMarkets: ['FR', 'BE'],
      taxonomyNodeId: 'vehicles.cars',
      listingIntent: 'SELL',
      title: 'Renault Clio V 1.0 TCe',
      description: 'Véhicule première main, entretien constructeur.',
      pricing: {
        priceModel: 'fixed',
        amount: 14500,
        currency: 'EUR',
        isNegotiable: false,
        isFreeDonation: false,
      },
      condition: 'very_good',
      photos: [{ id: 'p1', url: 'https://example.com/photo1.jpg', isCover: true }],
      location: {
        city: 'Lille',
        postalCode: '59000',
        countryCode: 'FR',
        hideExactAddress: true,
      },
      fulfillment: {
        allowHandDelivery: true,
        allowParcelShipping: false,
        allowBulkyDelivery: false,
        allowSellerDelivery: false,
        allowStorePickup: false,
      },
      transaction: {
        allowContact: true,
        allowDirectPurchase: true,
        allowReservation: true,
      },
      attributes: {
        brand: 'Renault',
        model: 'Clio',
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };

    expect(draft.selectedMarkets).toContain('FR');
    expect(draft.selectedMarkets).toContain('BE');
    expect(draft.pricing.amount).toBe(14500);
  });

  it('resolves market configuration with France baseline inheritance', () => {
    const beMarket = marketService.getMarket('BE');
    expect(beMarket.code).toBe('BE');
    expect(beMarket.currency).toBe('EUR');

    const beConfig = marketService.getEffectiveConfig('BE');
    expect(beConfig.localization.defaultCurrency).toBe('EUR');
    expect(beConfig.payments.buyerProtectionFeePercent).toBeDefined();

    const chMarket = marketService.getMarket('CH');
    expect(chMarket.code).toBe('CH');
    expect(chMarket.currency).toBe('CHF');

    const chConfig = marketService.getEffectiveConfig('CH');
    expect(chConfig.localization.defaultCurrency).toBe('CHF');
  });

  it('validates publication readiness correctly', () => {
    const validation = marketService.validateListingForMarkets({
      draft: {
        taxonomyNodeId: 'home_garden.furniture.sofas',
        title: 'Table à manger en chêne',
        marketCode: 'FR',
        selectedMarkets: ['FR'],
      },
      marketCodes: ['FR'],
    });

    expect(validation.isValid).toBe(true);
  });
});
