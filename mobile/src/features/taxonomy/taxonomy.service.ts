import {
  type ResolveTaxonomyV4PublicInput,
  type TaxonomyV4OptionPage,
  type TaxonomyV4ResolvedSchema,
  type TaxonomyV4TreeResponse,
  taxonomyV4OptionPageSchema,
  taxonomyV4ResolvedSchemaSchema,
  taxonomyV4TreeResponseSchema,
} from "@shongre/contracts";
import { apiOperation } from "@/api/generated-api-operation";

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
      await apiOperation(
        "getTaxonomyV4Tree",
        { query: { locale: input.locale, version: "4.0.0" } },
        input.marketContext.countryCode ?? undefined,
      ),
    );
  }

  async resolve(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema> {
    return taxonomyV4ResolvedSchemaSchema.parse(
      await apiOperation(
        "resolveTaxonomyV4PublicationSchema",
        {
          query: {
            category: input.categoryIdentity,
            sellerType: input.sellerType,
            locale: input.locale,
            version: (input.taxonomyVersion ?? "4.0.0") as "4.0.0",
            ...(input.listingTypeId
              ? { listingTypeId: input.listingTypeId }
              : {}),
            ...(input.intent ? { intent: input.intent } : {}),
          },
        },
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
    return taxonomyV4OptionPageSchema.parse(
      await apiOperation(
        "getTaxonomyV4Options",
        {
          path: { optionSetId: input.optionSetId },
          query: {
            version: "4.0.0",
            ...(input.parentOptionId
              ? { parentOptionId: input.parentOptionId }
              : {}),
            ...(input.query ? { q: input.query } : {}),
            ...(input.cursor ? { cursor: input.cursor } : {}),
            ...(input.limit ? { limit: input.limit } : {}),
          },
        },
        input.marketContext.countryCode ?? undefined,
      ),
    );
  }
}

export const taxonomyService: MobileTaxonomyService =
  new HttpMobileTaxonomyService();
