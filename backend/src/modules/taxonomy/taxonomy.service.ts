import { Category } from '../../shared/types/index.js';
import {
  ITaxonomyRepository,
  repositories,
  TaxonomyAttribute,
  TaxonomyNode,
  CANONICAL_DEMO_CATEGORIES,
} from '../../infrastructure/database/repositories/index.js';

export type { TaxonomyAttribute, TaxonomyNode };
export const CANONICAL_CATEGORIES: Category[] = CANONICAL_DEMO_CATEGORIES;

export class TaxonomyService {
  constructor(private taxonomyRepo: ITaxonomyRepository = repositories.taxonomy) {}

  async getRootCategories(): Promise<Category[]> {
    return this.taxonomyRepo.getRootCategories();
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    return this.taxonomyRepo.getNodeById(id);
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    return this.taxonomyRepo.getNodeBySlug(slug);
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    return this.taxonomyRepo.getChildren(nodeId);
  }

  async getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]> {
    return this.taxonomyRepo.getAttributesForCategory(categoryId);
  }

  async resolveSearchFilters(nodeId?: string): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>> {
    const attrs = await this.getAttributesForCategory(nodeId || 'root');
    return attrs.filter((attribute) => attribute.filterable !== false).map((attribute) => ({
      attribute,
      facetType: attribute.dataType === 'select' || attribute.dataType === 'multi_select'
        ? 'multi_select'
        : attribute.dataType === 'number' || attribute.dataType === 'year' || attribute.dataType === 'range'
          ? 'range'
          : attribute.dataType === 'boolean' ? 'boolean' : 'keyword',
    }));
  }
}

export const taxonomyService = new TaxonomyService();
