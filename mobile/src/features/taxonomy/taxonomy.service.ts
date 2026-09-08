import {
  type ResolveTaxonomyV1PublicInput,
  type TaxonomyV1OptionPage,
  type TaxonomyV1ResolvedSchema,
  type TaxonomyV1TreeResponse,
  taxonomyV1OptionPageSchema,
  taxonomyV1ResolvedSchemaSchema,
  taxonomyV1TreeResponseSchema,
} from "@shongre/contracts";
import { apiOperation } from "@/api/generated-api-operation";

export interface MobileTaxonomyService {
  tree(input: {
    marketContext: ResolveTaxonomyV1PublicInput["marketContext"];
    locale: string;
  }): Promise<TaxonomyV1TreeResponse>;
  resolve(
    input: ResolveTaxonomyV1PublicInput,
  ): Promise<TaxonomyV1ResolvedSchema>;
  lookupOptions(input: {
    marketContext: ResolveTaxonomyV1PublicInput["marketContext"];
    optionSetId: string;
    taxonomyRevision?: number;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }): Promise<TaxonomyV1OptionPage>;
}

export class HttpMobileTaxonomyService implements MobileTaxonomyService {
  async tree(input: {
    marketContext: ResolveTaxonomyV1PublicInput["marketContext"];
    locale: string;
  }): Promise<TaxonomyV1TreeResponse> {
    return taxonomyV1TreeResponseSchema.parse(
      await apiOperation(
        "getTaxonomyV1Tree",
        { query: { locale: input.locale, version: "v1" } },
        input.marketContext.countryCode ?? undefined,
      ),
    );
  }

  async resolve(
    input: ResolveTaxonomyV1PublicInput,
  ): Promise<TaxonomyV1ResolvedSchema> {
    return taxonomyV1ResolvedSchemaSchema.parse(
      await apiOperation(
        "resolveTaxonomyV1PublicationSchema",
        {
          query: {
            revision: input.taxonomyRevision,
            category: input.categoryIdentity,
            sellerType: input.sellerType,
            locale: input.locale,
            version: (input.taxonomyVersion ?? "v1") as "v1",
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
    marketContext: ResolveTaxonomyV1PublicInput["marketContext"];
    optionSetId: string;
    taxonomyRevision?: number;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }): Promise<TaxonomyV1OptionPage> {
    return taxonomyV1OptionPageSchema.parse(
      await apiOperation(
        "getTaxonomyV1Options",
        {
          path: { optionSetId: input.optionSetId },
          query: {
            revision: input.taxonomyRevision,
            version: "v1",
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
