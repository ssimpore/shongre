import { TaxonomyServiceContract } from '../../contracts/taxonomy.contract';
import { taxonomyService } from '../../../domains/taxonomy/taxonomy.service';
import { Category } from '../../../types';
import { TaxonomyNode, TaxonomyAttribute } from '../../../domains/taxonomy/taxonomy.types';
import { simulateNetworkDelay } from '../../client/api-client.config';

export class DemoTaxonomyService implements TaxonomyServiceContract {
  async getRootCategories(): Promise<Category[]> {
    await simulateNetworkDelay();
    return taxonomyService.getRootCategories() as any;
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    await simulateNetworkDelay();
    return taxonomyService.getNode(id) || null;
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    await simulateNetworkDelay();
    return taxonomyService.getNodeBySlug(slug) || null;
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    await simulateNetworkDelay();
    return taxonomyService.getChildren(nodeId);
  }

  async getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]> {
    await simulateNetworkDelay();
    const schema = taxonomyService.resolvePublicationSchema(categoryId);
    return schema.attributes;
  }

  async resolveSearchFilters(nodeId?: string): Promise<any[]> {
    await simulateNetworkDelay();
    return taxonomyService.resolveSearchFilters(nodeId);
  }
}

export const demoTaxonomyService = new DemoTaxonomyService();
