import { z } from "zod";
import {
  taxonomyV4PublicBundleSchema,
  taxonomyV4MetadataSchema,
  taxonomyV4DependencyRuleSchema,
  taxonomyV4ValidationRuleSchema,
} from "@shongre/contracts/taxonomy";

/** The resolver accepts database projections and explicit test/import inputs. */
export const taxonomyPrivateBundleSchema = taxonomyV4PublicBundleSchema
  .omit({ dependencyRules: true, compatibility: true })
  .extend({
    metadata: taxonomyV4MetadataSchema.omit({
      pagination: true,
      sourceCounts: true,
    }),
    dependencies: z.array(
      taxonomyV4DependencyRuleSchema.extend({
        effect: z.string(),
        status: z.string(),
      }),
    ),
    validationRules: z.array(
      taxonomyV4ValidationRuleSchema.extend({
        expression: z.string(),
        status: z.string(),
      }),
    ),
    verticals: z.array(z.record(z.unknown())),
    countryPolicyDrafts: z.array(z.record(z.unknown())),
    sellerRules: z.array(z.record(z.unknown())),
    policies: z.record(z.unknown()),
    referenceData: z.array(z.record(z.unknown())),
    crosswalk: z.record(z.unknown()),
    resolver: z.object({ precedence: z.array(z.string()) }),
    quarantine: z.record(z.unknown()),
    verification: z.record(z.unknown()),
  });

export type TaxonomyV4PrivateBundle = z.infer<
  typeof taxonomyPrivateBundleSchema
>;
