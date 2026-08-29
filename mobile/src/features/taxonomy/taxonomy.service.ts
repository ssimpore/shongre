import {
  TaxonomyV4PublicResolver,
  type ResolveTaxonomyV4PublicInput,
  type TaxonomyV4OptionPage,
  type TaxonomyV4ResolvedSchema,
  type TaxonomyV4TreeResponse,
} from "@shongre/contracts";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export interface MobileTaxonomyService {
  tree(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    locale: string;
  }): Promise<TaxonomyV4TreeResponse>;
  resolve(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema>;
  lookupOptions(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }): Promise<TaxonomyV4OptionPage>;
}

const demoResolver = new TaxonomyV4PublicResolver(getTaxonomyV4PublicBundle());

class DemoMobileTaxonomyService implements MobileTaxonomyService {
  async tree(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    locale: string;
  }): Promise<TaxonomyV4TreeResponse> {
    return demoResolver.tree(input.marketContext, input.locale, "4.0.0");
  }

  async resolve(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema> {
    return demoResolver.resolve(input);
  }

  async lookupOptions(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }): Promise<TaxonomyV4OptionPage> {
    return demoResolver.lookupOptions(input);
  }
}

class HttpMobileTaxonomyService implements MobileTaxonomyService {
  async tree(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    locale: string;
  }): Promise<TaxonomyV4TreeResponse> {
    return apiRequest<TaxonomyV4TreeResponse>(
      `/taxonomy/v4/tree?locale=${encodeURIComponent(input.locale)}&version=4.0.0`,
      {},
      input.marketContext.countryCode ?? undefined,
    );
  }

  async resolve(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema> {
    const query = new URLSearchParams({
      category: input.categoryIdentity,
      sellerType: input.sellerType,
      locale: input.locale,
      version: input.taxonomyVersion ?? "4.0.0",
    });
    if (input.listingTypeId) query.set("listingTypeId", input.listingTypeId);
    if (input.intent) query.set("intent", input.intent);
    return apiRequest<TaxonomyV4ResolvedSchema>(
      `/taxonomy/v4/resolve?${query.toString()}`,
      {},
      input.marketContext.countryCode ?? undefined,
    );
  }

  async lookupOptions(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }): Promise<TaxonomyV4OptionPage> {
    const query = new URLSearchParams({ version: "4.0.0" });
    if (input.parentOptionId) query.set("parentOptionId", input.parentOptionId);
    if (input.query) query.set("q", input.query);
    if (input.cursor) query.set("cursor", input.cursor);
    if (input.limit) query.set("limit", String(input.limit));
    return apiRequest<TaxonomyV4OptionPage>(
      `/taxonomy/v4/options/${encodeURIComponent(input.optionSetId)}?${query.toString()}`,
      {},
      input.marketContext.countryCode ?? undefined,
    );
  }
}

export const taxonomyService: MobileTaxonomyService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoMobileTaxonomyService()
    : new HttpMobileTaxonomyService();
