import {
  type ResolveTaxonomyV4PublicInput,
  type TaxonomyV4OptionPage,
  type TaxonomyV4ResolvedSchema,
  type TaxonomyV4TreeResponse,
  taxonomyV4OptionPageSchema,
  taxonomyV4ResolvedSchemaSchema,
  taxonomyV4TreeResponseSchema,
} from "@shongre/contracts";
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";

type TreeResponse =
  operations["getTaxonomyV4Tree"]["responses"][200]["content"]["application/json"];
type ResolvedResponse =
  operations["resolveTaxonomyV4PublicationSchema"]["responses"][200]["content"]["application/json"];
type OptionsResponse =
  operations["getTaxonomyV4Options"]["responses"][200]["content"]["application/json"];

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

export class HttpMobileTaxonomyService implements MobileTaxonomyService {
  async tree(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    locale: string;
  }): Promise<TaxonomyV4TreeResponse> {
    return taxonomyV4TreeResponseSchema.parse(
      await apiRequest<TreeResponse>(
        `/taxonomy/v4/tree?locale=${encodeURIComponent(input.locale)}&version=4.0.0`,
        {},
        input.marketContext.countryCode ?? undefined,
      ),
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
    return taxonomyV4ResolvedSchemaSchema.parse(
      await apiRequest<ResolvedResponse>(
        `/taxonomy/v4/resolve?${query.toString()}`,
        {},
        input.marketContext.countryCode ?? undefined,
      ),
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
    return taxonomyV4OptionPageSchema.parse(
      await apiRequest<OptionsResponse>(
        `/taxonomy/v4/options/${encodeURIComponent(input.optionSetId)}?${query.toString()}`,
        {},
        input.marketContext.countryCode ?? undefined,
      ),
    );
  }
}

export const taxonomyService: MobileTaxonomyService =
  new HttpMobileTaxonomyService();
