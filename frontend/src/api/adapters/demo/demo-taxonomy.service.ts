import { TaxonomyServiceContract } from "../../contracts/taxonomy.contract";
import { taxonomyService } from "../../../domains/taxonomy/taxonomy.service";
import { Category } from "../../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../../domains/taxonomy/taxonomy.types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import {
  TaxonomyV4PublicResolver,
  type ResolveTaxonomyV4PublicInput,
  type TaxonomyV4OptionPage,
  type TaxonomyV4ResolvedSchema,
  type TaxonomyV4TreeResponse,
} from "@shongre/contracts";

const taxonomyV4Resolver = new TaxonomyV4PublicResolver(
  getTaxonomyV4PublicBundle(),
);

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

  async getAttributesForCategory(
    categoryId: string,
  ): Promise<TaxonomyAttribute[]> {
    await simulateNetworkDelay();
    const schema = taxonomyService.resolvePublicationSchema(categoryId);
    return schema?.attributes ?? [];
  }

  async resolveSearchFilters(nodeId?: string): Promise<any[]> {
    await simulateNetworkDelay();
    return taxonomyService.resolveSearchFilters(nodeId);
  }

  async getV4Tree(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    locale: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4TreeResponse> {
    await simulateNetworkDelay();
    return taxonomyV4Resolver.tree(
      input.marketContext,
      input.locale,
      input.taxonomyVersion,
    );
  }

  async resolveV4(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema> {
    await simulateNetworkDelay();
    return taxonomyV4Resolver.resolve(input);
  }

  async lookupV4Options(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
    locale?: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4OptionPage> {
    await simulateNetworkDelay();
    taxonomyV4Resolver.tree(input.marketContext, input.locale ?? "fr-FR");
    return taxonomyV4Resolver.lookupOptions(input);
  }
}

export const demoTaxonomyService = new DemoTaxonomyService();
