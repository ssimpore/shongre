import { taxonomyReferenceEntrySchema } from "./taxonomy.references.js";
import { z } from "zod";
import {
  taxonomyV1PublicBundleSchema,
  taxonomyV1MetadataSchema,
  taxonomyV1DependencyRuleSchema,
  taxonomyV1ValidationRuleSchema,
} from "@shongre/contracts/taxonomy";

/** The resolver accepts database projections and explicit test/import inputs. */
export const taxonomyPrivateBundleSchema = taxonomyV1PublicBundleSchema
  .omit({ dependencyRules: true })
  .extend({
    metadata: taxonomyV1MetadataSchema.omit({
      pagination: true,
      sourceCounts: true,
    }),
    dependencies: z.array(
      taxonomyV1DependencyRuleSchema.extend({
        effect: z.string(),
        status: z.string(),
      }),
    ),
    validationRules: z.array(
      taxonomyV1ValidationRuleSchema.extend({
        expression: z.string(),
        status: z.string(),
      }),
    ),
    verticals: z.array(z.record(z.unknown())),
    countryPolicyDrafts: z.array(z.record(z.unknown())),
    sellerRules: z.array(z.record(z.unknown())),
    policies: z.record(z.unknown()),
    referenceData: z.array(z.record(z.unknown())),
    referenceEntries: z.array(taxonomyReferenceEntrySchema),
    resolver: z.object({ precedence: z.array(z.string()) }),
    quarantine: z.record(z.unknown()),
    verification: z.record(z.unknown()),
  });

export type TaxonomyV1PrivateBundle = z.infer<
  typeof taxonomyPrivateBundleSchema
>;
