import { recordedResponses } from "./taxonomy-responses.generated";
import {
  taxonomyV1OptionPageSchema,
  taxonomyV1ResolvedSchemaSchema,
  taxonomyV1TreeResponseSchema,
  type ResolveTaxonomyV1PublicInput,
} from "../schemas/taxonomy";
import type { MarketContext } from "../market-country";

const responses = recordedResponses as {
  trees: Record<string, unknown>;
  schemas: Record<string, unknown>;
  options: Record<string, unknown>;
};

/** Recorded backend responses for isolated tests; this performs no resolution. */
export const recordedTaxonomyResponses = {
  tree(context: MarketContext, locale: string) {
    return {
      ...taxonomyV1TreeResponseSchema.parse(
        responses.trees[context.countryCode ?? ""],
      ),
      locale,
    };
  },
  resolve(input: ResolveTaxonomyV1PublicInput) {
    return taxonomyV1ResolvedSchemaSchema.parse(
      responses.schemas[`${input.categoryIdentity}/${input.sellerType}`],
    );
  },
  lookupOptions(input: { optionSetId: string; parentOptionId: string }) {
    return taxonomyV1OptionPageSchema.parse(
      responses.options[`${input.optionSetId}/${input.parentOptionId}`],
    );
  },
};
