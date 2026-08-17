import { Category } from '../../types';
import { TaxonomyNode, TaxonomyAttribute } from '../../domains/taxonomy/taxonomy.types';

export interface TaxonomyServiceContract {
  getRootCategories(): Promise<Category[]>;
  getNodeById(id: string): Promise<TaxonomyNode | null>;
  getNodeBySlug(slug: string): Promise<TaxonomyNode | null>;
  getChildren(nodeId: string): Promise<TaxonomyNode[]>;
  getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]>;
  resolveSearchFilters(nodeId?: string): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>>;
}
