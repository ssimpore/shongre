import { describe, expect, it } from 'vitest';
import { DemoTaxonomyRepository } from '../../src/infrastructure/database/repositories/taxonomy.repository.js';
import { TaxonomyService } from '../../src/modules/taxonomy/taxonomy.service.js';
import { TaxonomyValidationService } from '../../src/modules/taxonomy/taxonomy.validation.js';

describe('taxonomy publication validation', () => {
  const validation = new TaxonomyValidationService(
    new TaxonomyService(new DemoTaxonomyRepository()),
  );

  it('rejects missing required vehicle fields and rogue attributes', async () => {
    const result = await validation.validateListingAttributes('vehicles', {
      mileage: 120000,
      unknown_field: 'not allowed',
    });

    expect(result.isValid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['ATTRIBUTE_REQUIRED', 'UNKNOWN_ATTRIBUTE']),
    );
  });

  it('accepts a complete vehicle attribute payload', async () => {
    const result = await validation.validateListingAttributes('vehicles', {
      condition: 'bon-etat',
      brand: 'Renault',
      mileage: 120000,
      fuel: 'essence',
      year: 2020,
      transmission: 'manuelle',
    });

    expect(result).toEqual({ isValid: true, issues: [] });
  });
});
