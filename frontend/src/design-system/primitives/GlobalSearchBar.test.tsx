import { describe, it, expect } from 'vitest';
import { routes } from '../../configuration/routes';
import { TAXONOMY } from '../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { SEARCH_PLACEHOLDER } from '../../configuration/search.config';

describe('GlobalSearchBar Component & Search Routing Contract', () => {
  describe('routes.search helper', () => {
    it('generates search URL with plain string query', () => {
      const url = routes.search('velo');
      expect(url).toBe('/recherche?query=velo');
    });

    it('generates empty search URL when no query is passed', () => {
      const url = routes.search();
      expect(url).toBe('/recherche');
    });

    it('generates search URL with view mode', () => {
      const url = routes.search('velo', 'map');
      expect(url).toBe('/recherche?query=velo&view=map');
    });

    it('generates search URL with multi-criteria object (query, category, city, radius)', () => {
      const url = routes.search({
        query: 'peugeot 208',
        category: 'vehicules',
        subCategory: 'vehicles.cars',
        city: 'Lyon',
        radius: 30,
        sortBy: 'price_asc',
      });
      expect(url).toContain('query=peugeot+208');
      expect(url).toContain('category=vehicules');
      expect(url).toContain('subCategory=vehicles.cars');
      expect(url).toContain('city=Lyon');
      expect(url).toContain('radius=30');
      expect(url).toContain('sortBy=price_asc');
    });

    it('ignores 0 or empty radius in route params', () => {
      const url = routes.search({
        query: 'table',
        city: 'Paris',
        radius: 0,
      });
      expect(url).toContain('query=table');
      expect(url).toContain('city=Paris');
      expect(url).not.toContain('radius=');
    });
  });

  describe('Search Configuration & Placeholders', () => {
    it('provides standard full and compact placeholders', () => {
      expect(SEARCH_PLACEHOLDER.full).toBeTruthy();
      expect(SEARCH_PLACEHOLDER.compact).toBeTruthy();
      expect(typeof SEARCH_PLACEHOLDER.full).toBe('string');
      expect(typeof SEARCH_PLACEHOLDER.compact).toBe('string');
    });
  });

  describe('Taxonomy Category Integration', () => {
    it('has valid categories in canonical taxonomy matching all categories', () => {
      expect(TAXONOMY.length).toBeGreaterThan(0);
      TAXONOMY.forEach((cat) => {
        const compactLabel = getTaxonomyLabel(cat, 'compact');
        expect(compactLabel).toBeTruthy();
        expect(cat.slug).toBeTruthy();
        expect(cat.subCategories).toBeInstanceOf(Array);
      });
    });
  });
});
