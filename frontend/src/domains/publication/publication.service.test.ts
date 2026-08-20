/**
 * SHONGRE PUBLICATION & TRANSACTION AUTOMATED TEST SUITE
 * Exhaustively validates taxonomy leaf resolution, conditional attributes,
 * transaction modes independence, fulfillment quotes, and backend validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { taxonomyService } from '../taxonomy/taxonomy.service';
import { publicationResolver } from './publication.resolver';
import { transactionCapabilitiesService } from '../transaction/transaction.capabilities';
import { fulfillmentResolver } from '../fulfillment/fulfillment.resolver';
import { publicationService } from './publication.service';
import { ATTRIBUTE_REGISTRY } from '../taxonomy/attribute.registry';
import { PublicationDraftState } from './publication.types';

describe('Publication System & Schema Resolvers', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  // =========================================================================
  // 1. EXHAUSTIVE TAXONOMY LEAF COVERAGE TEST
  // =========================================================================
  it('programmatically verifies that EVERY active publishable leaf resolves a valid publication schema', () => {
    const publishableLeaves = taxonomyService.getPublishableLeaves();
    expect(publishableLeaves.length).toBeGreaterThan(20);

    publishableLeaves.forEach((leaf) => {
      const schema = publicationResolver.resolve({
        taxonomyNodeId: leaf.id,
        marketCode: 'FR',
      });

      expect(schema, `Schema for leaf "${leaf.id}" (${leaf.name}) must resolve`).not.toBeNull();
      if (!schema) return;

      expect(schema.node.id).toBe(leaf.id);
      expect(schema.conditionScheme.length).toBeGreaterThan(0);
      expect(schema.supportedIntents.length).toBeGreaterThan(0);
      expect(schema.supportedPriceModels.length).toBeGreaterThan(0);
      expect(schema.currency.symbol).toBe('€');

      // Verify all resolved attributes exist in registry
      schema.attributes.forEach((attr) => {
        expect(
          ATTRIBUTE_REGISTRY[attr.id],
          `Attribute "${attr.id}" on leaf "${leaf.id}" must exist in ATTRIBUTE_REGISTRY`
        ).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 2. DECLARATIVE CONDITIONAL DEPENDENCIES
  // =========================================================================
  it('evaluates declarative conditional dependencies dynamically', () => {
    // When fuel is electric on cars
    const electricSchema = publicationResolver.resolve({
      taxonomyNodeId: 'vehicles.cars',
      currentValues: { fuel: 'electrique' },
    });

    expect(electricSchema).not.toBeNull();
    const batteryField = electricSchema?.fields.find((f) => f.attribute.code === 'battery_capacity');
    expect(batteryField?.isVisiblyMet).toBe(true);

    // When fuel is diesel on cars
    const dieselSchema = publicationResolver.resolve({
      taxonomyNodeId: 'vehicles.cars',
      currentValues: { fuel: 'diesel' },
    });

    const batteryFieldDiesel = dieselSchema?.fields.find((f) => f.attribute.code === 'battery_capacity');
    expect(batteryFieldDiesel?.isVisiblyMet).toBe(false);
  });

  // =========================================================================
  // 3. TRANSACTION CAPABILITIES RESOLUTION & INDEPENDENCE
  // =========================================================================
  it('strictly decouples Direct Online Purchase from Reservation', () => {
    // Smartphone: Supports Direct Purchase + Reservation + Contact
    const phoneCaps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: 'electronics.telephony.smartphones',
      price: 490,
      stock: 1,
    });
    expect(phoneCaps.canContact).toBe(true);
    expect(phoneCaps.canDirectPurchase).toBe(true);
    expect(phoneCaps.canReserve).toBe(true);

    // Real Estate: Contact only (Direct purchase disabled)
    const reCaps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: 'real_estate.sales',
      price: 250000,
    });
    expect(reCaps.canContact).toBe(true);
    expect(reCaps.canDirectPurchase).toBe(false);

    // Free Donation (0 €): Contact only (No paid purchase/reservation)
    const donationCaps = transactionCapabilitiesService.resolve({
      taxonomyNodeId: 'home_garden.furniture.sofas',
      listingIntent: 'GIVE',
      price: 0,
    });
    expect(donationCaps.canContact).toBe(true);
    expect(donationCaps.canDirectPurchase).toBe(false);
  });

  // =========================================================================
  // 4. FULFILLMENT RESOLUTION & MULTI-CARRIER QUOTES
  // =========================================================================
  it('resolves accurate fulfillment capabilities and delivery quotes across categories', () => {
    // Smartphone -> Parcel shipping enabled
    const phoneFulfillment = fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: 'electronics.telephony.smartphones',
    });
    expect(phoneFulfillment.allowHandDelivery).toBe(true);
    expect(phoneFulfillment.allowParcelShipping).toBe(true);
    expect(phoneFulfillment.allowBulkyDelivery).toBe(false);

    // Sofa -> Bulky delivery enabled, Parcel disabled
    const sofaFulfillment = fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: 'home_garden.furniture.sofas',
    });
    expect(sofaFulfillment.allowHandDelivery).toBe(true);
    expect(sofaFulfillment.allowBulkyDelivery).toBe(true);
    expect(sofaFulfillment.allowParcelShipping).toBe(false);

    // Delivery quotes at checkout for smartphone
    const quotes = fulfillmentResolver.resolveAvailableQuotes({
      listing: {
        id: 'list-phone',
        title: 'iPhone 15 Pro',
        price: 850,
        city: 'Lyon',
        postalCode: '69002',
        deliveryOptions: [
          { type: 'hand_delivery', available: true },
          { type: 'relay_point', available: true },
          { type: 'home_delivery', available: true },
        ],
      } as any,
    });

    expect(quotes.length).toBeGreaterThanOrEqual(3);
    const handQuote = quotes.find((q) => q.code === 'HAND_DELIVERY');
    const relayQuote = quotes.find((q) => q.code === 'MONDIAL_RELAY');
    const homeQuote = quotes.find((q) => q.code === 'COLISSIMO_HOME');

    expect(handQuote?.price).toBe(0);
    expect(relayQuote?.price).toBeGreaterThan(0);
    expect(homeQuote?.price).toBeGreaterThan(relayQuote!.price);
  });

  // =========================================================================
  // 5. AUTHORITATIVE BACKEND PRICING CALCULATION
  // =========================================================================
  it('calculates transparent, authoritative order pricing', () => {
    const pricing = fulfillmentResolver.calculateOrderPricing({
      listing: {
        price: 200,
        sellerType: 'individual',
      } as any,
      quantity: 1,
      selectedQuote: {
        id: 'quote-colissimo',
        code: 'COLISSIMO_HOME',
        price: 6.99,
      } as any,
    });

    expect(pricing.itemSubtotal).toBe(200);
    expect(pricing.deliveryFee).toBe(6.99);
    expect(pricing.buyerServiceFee).toBeGreaterThan(0);
    expect(pricing.buyerTotal).toBeCloseTo(200 + 6.99 + pricing.buyerServiceFee, 2);
    expect(pricing.sellerNet).toBe(200);
  });

  // =========================================================================
  // 6. BACKEND VALIDATION & AUTOSAVE DRAFT LIFECYCLE
  // =========================================================================
  it('validates required attributes and rejects incomplete drafts', () => {
    const invalidDraft: Partial<PublicationDraftState> = {
      taxonomyNodeId: 'vehicles.cars',
      title: '', // Too short
      description: 'Court',
      photos: [],
      pricing: { priceModel: 'fixed', amount: -10, currency: 'EUR', isNegotiable: false, isFreeDonation: false },
    };

    const validation = publicationService.validateDraft(invalidDraft);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((e) => e.field === 'title')).toBe(true);
    expect(validation.errors.some((e) => e.field === 'photos')).toBe(true);
    expect(validation.errors.some((e) => e.field === 'pricing.amount')).toBe(true);
  });

  it('saves, retrieves and restores draft seamlessly', () => {
    const mockDraft: PublicationDraftState = {
      marketCode: 'FR',
      taxonomyNodeId: 'home_garden.furniture.sofas',
      listingIntent: 'SELL',
      title: 'Canapé convertible 3 places',
      description: 'Superbe canapé beige en parfait état.',
      condition: 'very_good',
      attributes: { material: 'velours' },
      photos: [{ id: 'p1', url: 'https://images.unsplash.com/test.jpg', isCover: true }],
      pricing: { priceModel: 'fixed', amount: 250, currency: 'EUR', isNegotiable: true, isFreeDonation: false },
      transaction: { allowContact: true, allowDirectPurchase: true, allowReservation: true },
      fulfillment: {
        allowHandDelivery: true,
        allowParcelShipping: false,
        allowBulkyDelivery: true,
        allowSellerDelivery: false,
        allowStorePickup: false,
      },
      location: { city: 'Bordeaux', postalCode: '33000', countryCode: 'FR', hideExactAddress: true },
      currentStep: 3,
      updatedAt: new Date().toISOString(),
    };

    publicationService.saveDraft(mockDraft, 'user-123');
    const restored = publicationService.getDraft('user-123');
    expect(restored).not.toBeNull();
    expect(restored?.title).toBe('Canapé convertible 3 places');
    expect(restored?.pricing.amount).toBe(250);
  });
});
