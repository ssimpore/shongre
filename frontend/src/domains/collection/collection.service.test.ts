import { describe, it, expect } from 'vitest';
import { collectionService } from './collection.service';
import { ALL_COLLECTIONS, COLLECTION_PILLARS } from './collection.data';
import { Listing } from '../../types';

describe('CollectionService', () => {
  it('returns all collection pillars', () => {
    const pillars = collectionService.getPillars();
    expect(pillars.length).toBeGreaterThan(5);
    expect(pillars.some((p) => p.id === 'editorial')).toBe(true);
    expect(pillars.some((p) => p.id === 'budget')).toBe(true);
    expect(pillars.some((p) => p.id === 'style')).toBe(true);
  });

  it('retrieves collections by pillar', () => {
    const all = collectionService.getCollections('all');
    expect(all.length).toBe(ALL_COLLECTIONS.length);

    const budgetCols = collectionService.getCollections('budget');
    expect(budgetCols.length).toBeGreaterThan(0);
    budgetCols.forEach((col) => {
      expect(col.pillarId).toBe('budget');
    });
  });

  it('retrieves a single collection by slug', () => {
    const col = collectionService.getCollection('moins-de-50');
    expect(col).toBeDefined();
    expect(col?.title).toContain('moins de 50 €');
  });

  it('filters listings accurately for a budget collection (moins-de-50)', () => {
    const col = collectionService.getCollection('moins-de-50')!;
    const mockListings: Listing[] = [
      {
        id: '1',
        title: 'T-shirt vintage',
        price: 25,
        status: 'active',
      } as Listing,
      {
        id: '2',
        title: 'Vélo de course',
        price: 350,
        status: 'active',
      } as Listing,
      {
        id: '3',
        title: 'Livre déco',
        price: 15,
        status: 'active',
      } as Listing,
    ];

    const results = collectionService.filterListingsForCollection(col, mockListings);
    expect(results.some((l) => l.id === '1')).toBe(true);
    expect(results.some((l) => l.id === '3')).toBe(true);
    expect(results.some((l) => l.id === '2')).toBe(false);
  });

  it('filters listings for discount collection (bons-plans)', () => {
    const col = collectionService.getCollection('bons-plans')!;
    const mockListings: Listing[] = [
      {
        id: '1',
        title: 'Manteau Sézane',
        price: 195,
        originalPrice: 320,
        status: 'active',
      } as Listing,
      {
        id: '2',
        title: 'Livre',
        price: 10,
        status: 'active',
      } as Listing,
    ];

    const results = collectionService.filterListingsForCollection(col, mockListings);
    expect(results.some((l) => l.id === '1')).toBe(true);
    expect(results.some((l) => l.id === '2')).toBe(false);
  });

  it('filters listings for free donation collection (dons-gratuit)', () => {
    const col = collectionService.getCollection('dons-gratuit')!;
    const mockListings: Listing[] = [
      {
        id: '1',
        title: 'Lot de pots',
        price: 0,
        isFreeDonation: true,
        status: 'active',
      } as Listing,
      {
        id: '2',
        title: 'Chaise',
        price: 50,
        isFreeDonation: false,
        status: 'active',
      } as Listing,
    ];

    const results = collectionService.filterListingsForCollection(col, mockListings);
    expect(results.some((l) => l.id === '1')).toBe(true);
    expect(results.some((l) => l.id === '2')).toBe(false);
  });
});
