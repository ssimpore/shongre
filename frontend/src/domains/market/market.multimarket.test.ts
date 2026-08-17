import { describe, it, expect } from 'vitest';
import { marketService } from './market.service';
import { publicationService } from '../publication/publication.service';
import { storageService } from '../../services/storage.service';
import { PublicationDraftState } from '../publication/publication.types';

describe('Multi-Market Publishing & Taxonomy Per Market', () => {
  it('should support category restriction per market and check eligibility', () => {
    // Check initial enabled status
    const isVehiclesInFR = marketService.isCategoryEnabledInMarket('FR', 'vehicules');
    expect(isVehiclesInFR).toBe(true);

    // Disable category in Luxembourg
    marketService.setCategoryEnabledInMarket('LU', 'vehicules', false);
    expect(marketService.isCategoryEnabledInMarket('LU', 'vehicules')).toBe(false);

    // Check that France is still enabled
    expect(marketService.isCategoryEnabledInMarket('FR', 'vehicules')).toBe(true);

    // Re-enable in Luxembourg
    marketService.setCategoryEnabledInMarket('LU', 'vehicules', true);
    expect(marketService.isCategoryEnabledInMarket('LU', 'vehicules')).toBe(true);
  });

  it('should validate multi-market listing drafts accurately', () => {
    const validation = marketService.validateListingForMarkets({
      draft: {
        taxonomyNodeId: 'home_garden.furniture.sofas',
        title: 'Canapé scandinave',
        marketCode: 'FR',
        selectedMarkets: ['FR', 'BE', 'LU'],
      },
      marketCodes: ['FR', 'BE', 'LU'],
    });

    expect(validation.isValid).toBe(true);
    expect(validation.marketResults['FR'].isValid).toBe(true);
    expect(validation.marketResults['BE'].isValid).toBe(true);
    expect(validation.marketResults['LU'].isValid).toBe(true);

    // Testing a paused or non-active market correctly flags ineligibility
    const pausedValidation = marketService.validateListingForMarkets({
      draft: {
        taxonomyNodeId: 'home_garden.furniture.sofas',
        title: 'Canapé scandinave',
        marketCode: 'FR',
        selectedMarkets: ['CH'],
      },
      marketCodes: ['CH'],
    });
    expect(pausedValidation.isValid).toBe(false);
    expect(pausedValidation.marketResults['CH'].isValid).toBe(false);
  });

  it('should create listings with multi-market publications and verify persistence', async () => {
    const user = storageService.getCurrentUser();

    const draft: PublicationDraftState = {
      marketCode: 'FR',
      selectedMarkets: ['FR', 'BE', 'LU'],
      taxonomyNodeId: 'home_garden.furniture.sofas',
      listingIntent: 'SELL',
      title: 'Table en chêne massif authentique',
      description: 'Superbe table de salle à manger en chêne massif en très bon état général.',
      pricing: {
        priceModel: 'fixed',
        amount: 250,
        originalPrice: 300,
        currency: 'EUR',
        isNegotiable: false,
        isFreeDonation: false,
      },
      condition: 'very_good',
      photos: [{ id: 'p1', url: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4', isCover: true }],
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
      attributes: {},
      currentStep: 10,
      updatedAt: new Date().toISOString(),
    };

    const created = await publicationService.publishListing(draft, user);

    expect(created.marketCode).toBe('FR');
    expect(created.marketCodes).toEqual(['FR', 'BE', 'LU']);
    expect(created.marketPublications?.length).toBe(3);
    expect(created.marketPublications?.some((p) => p.marketCode === 'FR' && p.isPrimary)).toBe(true);
  });
});
