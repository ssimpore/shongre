import { describe, it, expect } from 'vitest';
import { listingsService } from '../../src/modules/listings/listings.service.js';
import { ordersService } from '../../src/modules/orders/orders.service.js';

describe('Listing & Order Lifecycle', () => {
  it('creates a draft and validates mandatory publication fields', async () => {
    const draft = await listingsService.createListingDraft('user_thomas');
    expect(draft.step).toBe('category');

    await expect(
      listingsService.publishListing({ title: '', price: 0, categoryId: '' }, 'user_thomas')
    ).rejects.toThrow();
  });

  it('publishes a valid listing with automated safety assessment', async () => {
    const published = await listingsService.publishListing(
      {
        title: 'Appareil photo Sony Alpha 7 IV',
        description: 'Excellent état, vendu avec objectif 28-70mm et 2 batteries.',
        price: 1850,
        categoryId: 'multimedia',
        marketCode: 'FR',
        condition: 'tres-bon-etat',
        city: 'Lyon',
        postalCode: '69002',
      },
      'user_camille'
    );

    expect(published.id).toBeDefined();
    expect(published.status).toBe('published');
    expect(published.safetyRiskScore).toBeLessThan(50);
    expect(published.price).toBe(1850);
  });

  it('generates a 4-digit PIN for direct purchase hand delivery', async () => {
    const order = await ordersService.createDirectPurchase({
      listingId: 'list_1',
      buyerId: 'user_thomas',
      deliveryMethod: 'hand_delivery',
      paymentMethod: 'card',
    });

    expect(order.transactionType).toBe('DIRECT_PURCHASE');
    expect(order.deliveryMethod).toBe('hand_delivery');
    expect(order.handoverPin).toBeDefined();
    expect(order.handoverPin?.length).toBe(4);
  });

  it('rejects invalid PIN lengths during handover', async () => {
    await expect(ordersService.confirmHandoverPIN('ord_1', '12')).rejects.toThrow();
  });
});
