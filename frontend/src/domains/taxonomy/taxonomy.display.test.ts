import { describe, expect, it } from 'vitest';
import {
  getCompactTaxonomyLabelBySlug,
  getListingCategoryLabel,
  getListingSubCategoryLabel,
} from './taxonomy.display';

describe('taxonomy display labels', () => {
  it('uses the compact alias for category and subcategory presentation', () => {
    expect(getCompactTaxonomyLabelBySlug('vehicles')).toBe('Véhicules');
    expect(getCompactTaxonomyLabelBySlug('vehicles.cars')).toBe('Voitures');
  });

  it('resolves legacy listing slugs and preserves an explicit fallback', () => {
    expect(getListingCategoryLabel({ categorySlug: 'vehicules', categoryLabel: 'Véhicules & Mobilité' })).toBe('Véhicules');
    expect(getListingSubCategoryLabel({ subCategorySlug: 'unknown-category', subCategoryLabel: 'Libellé historique' })).toBe('Libellé historique');
  });
});
