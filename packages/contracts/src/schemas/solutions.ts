import { z } from "zod";
import { getCountryConfig } from "../market-country";
import { shongreApplicationIdSchema } from "../shongre-applications";
import { countryCodeSchema } from "../market-country";

export const SOLUTION_LIFECYCLES = [
  "DRAFT",
  "INTERNAL",
  "COMING_SOON",
  "BETA",
  "AVAILABLE",
  "MAINTENANCE",
  "DEPRECATED",
  "RETIRED",
] as const;

export const PUBLIC_SOLUTION_LIFECYCLES: readonly (typeof SOLUTION_LIFECYCLES)[number][] =
  ["COMING_SOON", "BETA", "AVAILABLE", "MAINTENANCE", "DEPRECATED"];

export const SOLUTION_ICON_IDS = [
  "prospects",
  "facturation",
  "marketplace",
  "pilotage",
  "apps",
] as const;

export const MIN_SOLUTION_SORT_ORDER = 0;

export const solutionLifecycleSchema = z.enum(SOLUTION_LIFECYCLES);
export const solutionIconIdSchema = z.enum(SOLUTION_ICON_IDS);
export const solutionSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const optionalNonEmptyString = (maximum: number) =>
  z.string().trim().min(1).max(maximum).optional();

const uniqueStrings = (maximum: number, itemMaximum: number, minimum = 0) =>
  z
    .array(z.string().trim().min(1).max(itemMaximum))
    .min(minimum)
    .max(maximum)
    .refine((values) => new Set(values).size === values.length, {
      message: "Les valeurs doivent être uniques.",
    });

const marketCodesSchema = z
  .array(countryCodeSchema)
  .min(1)
  .max(20)
  .refine((values) => new Set(values).size === values.length, {
    message: "Chaque marché ne peut être référencé qu’une fois.",
  })
  .superRefine((values, context) => {
    for (const value of values) {
      if (!getCountryConfig(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Le marché ${value} n’existe pas dans COUNTRY_REGISTRY.`,
        });
      }
    }
  });

export const solutionReleaseNoteSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5_000),
    publishedAt: z.string().datetime(),
  })
  .strict();

const solutionWritableFields = {
  name: z.string().trim().min(1).max(160),
  slug: solutionSlugSchema,
  shortDescription: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10_000),
  icon: solutionIconIdSchema,
  category: z.string().trim().min(1).max(160),
  lifecycle: solutionLifecycleSchema,
  availableFrom: z.string().datetime().optional(),
  availableUntil: z.string().datetime().optional(),
  markets: marketCodesSchema,
  languages: uniqueStrings(20, 32, 1),
  audiences: uniqueStrings(40, 200),
  capabilities: uniqueStrings(100, 300),
  launchApplicationId: shongreApplicationIdSchema.optional(),
  launchPath: optionalNonEmptyString(1_000).refine(
    (value) => !value || (value.startsWith("/") && !value.startsWith("//")),
    "Le chemin de lancement doit rester dans l’application.",
  ),
  documentationUrl: z
    .string()
    .url()
    .max(2_000)
    .refine((value) => value.startsWith("https://"), {
      message: "Le lien de documentation doit utiliser HTTPS.",
    })
    .optional(),
  entitlementKey: optionalNonEmptyString(200),
  requiresAuthentication: z.boolean(),
  requiresEntitlement: z.boolean(),
  releaseNotes: z
    .array(solutionReleaseNoteSchema)
    .max(100)
    .refine(
      (notes) => new Set(notes.map((note) => note.id)).size === notes.length,
      { message: "Les identifiants de notes de version doivent être uniques." },
    ),
  notice: optionalNonEmptyString(5_000),
  maintenanceMessage: optionalNonEmptyString(5_000),
  replacementSlug: solutionSlugSchema.optional(),
  sortOrder: z.number().int().min(MIN_SOLUTION_SORT_ORDER).max(1_000_000),
  catalogVisible: z.boolean(),
  featured: z.boolean(),
} as const;

export const solutionWritableSchema = z.object(solutionWritableFields).strict();

function validateSolutionRules(
  value: Partial<z.infer<typeof solutionWritableSchema>>,
  context: z.RefinementCtx,
): void {
  if (
    value.availableFrom &&
    value.availableUntil &&
    Date.parse(value.availableFrom) > Date.parse(value.availableUntil)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["availableUntil"],
      message: "La date de fin doit être postérieure à la date de début.",
    });
  }
  if (value.lifecycle === "AVAILABLE" && !value.launchApplicationId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["launchApplicationId"],
      message: "Une solution disponible exige une destination valide.",
    });
  }
  if (value.requiresEntitlement && !value.entitlementKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["entitlementKey"],
      message: "Un accès soumis à entitlement exige une clé.",
    });
  }
  if (value.requiresEntitlement && !value.requiresAuthentication) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["requiresAuthentication"],
      message: "Un entitlement exige une session authentifiée.",
    });
  }
  if (value.lifecycle === "MAINTENANCE" && !value.maintenanceMessage) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maintenanceMessage"],
      message: "La maintenance exige une explication publique.",
    });
  }
}

export const createSolutionInputSchema = solutionWritableSchema
  .extend({ releaseNotes: solutionWritableFields.releaseNotes.optional() })
  .superRefine(validateSolutionRules);

export const solutionDefinitionSchema = solutionWritableSchema
  .extend({
    id: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine(validateSolutionRules);

const nullableDateTime = z.string().datetime().nullable().optional();
const nullableText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional();

export const updateSolutionInputSchema = z
  .object({
    ...solutionWritableFields,
    availableFrom: nullableDateTime,
    availableUntil: nullableDateTime,
    launchApplicationId: shongreApplicationIdSchema.nullable().optional(),
    launchPath: nullableText(1_000).refine(
      (value) =>
        value === null ||
        value === undefined ||
        (value.startsWith("/") && !value.startsWith("//")),
      "Le chemin de lancement doit rester dans l’application.",
    ),
    documentationUrl: z
      .string()
      .url()
      .max(2_000)
      .refine((value) => value.startsWith("https://"), {
        message: "Le lien de documentation doit utiliser HTTPS.",
      })
      .nullable()
      .optional(),
    entitlementKey: nullableText(200),
    notice: nullableText(5_000),
    maintenanceMessage: nullableText(5_000),
    replacementSlug: solutionSlugSchema.nullable().optional(),
  })
  .omit({ lifecycle: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "La modification doit contenir au moins un champ.",
  });

export const reorderSolutionsInputSchema = z
  .object({
    solutionIds: z
      .array(z.string().min(1))
      .max(1_000)
      .refine((values) => new Set(values).size === values.length, {
        message: "Chaque solution ne peut apparaître qu’une fois.",
      }),
  })
  .strict();

export const transitionSolutionLifecycleInputSchema = z
  .object({
    lifecycle: solutionLifecycleSchema,
    explanation: z.string().trim().min(10).max(2_000),
  })
  .strict();

export const solutionLifecycleHistoryEntrySchema = z
  .object({
    id: z.string().min(1),
    solutionId: z.string().min(1),
    from: solutionLifecycleSchema.nullable(),
    to: solutionLifecycleSchema,
    explanation: z.string().min(1).max(2_000),
    actorId: z.string().min(1),
    actorName: z.string().min(1),
    occurredAt: z.string().datetime(),
  })
  .strict();

export type SolutionLifecycle = z.infer<typeof solutionLifecycleSchema>;
export type SolutionIconId = z.infer<typeof solutionIconIdSchema>;
export type SolutionReleaseNote = z.infer<typeof solutionReleaseNoteSchema>;
export type SolutionDefinition = z.infer<typeof solutionDefinitionSchema>;
export type CreateSolutionInput = z.infer<typeof createSolutionInputSchema>;
export type UpdateSolutionInput = z.infer<typeof updateSolutionInputSchema>;
export type ReorderSolutionsInput = z.infer<typeof reorderSolutionsInputSchema>;
export type TransitionSolutionLifecycleInput = z.infer<
  typeof transitionSolutionLifecycleInputSchema
>;
export type SolutionLifecycleHistoryEntry = z.infer<
  typeof solutionLifecycleHistoryEntrySchema
>;
