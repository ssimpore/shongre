import { z } from "zod";

export const HOMEPAGE_SECTION_TYPES = [
  "hero",
  "recent_searches",
  "trending",
  "deals",
  "recent_listings",
  "collections",
  "pro_cta",
] as const;

export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

export const HOMEPAGE_OFFER_TYPES = [
  "verified_price_reduction",
  "marketplace_deal",
  "time_limited_promotion",
  "professional_discount",
] as const;

export type HomepageOfferType = (typeof HOMEPAGE_OFFER_TYPES)[number];

export const HOMEPAGE_SELECTION_MODES = [
  "automatic",
  "manual",
  "hybrid",
] as const;

export type HomepageSelectionMode =
  (typeof HOMEPAGE_SELECTION_MODES)[number];

export const HOMEPAGE_ADMIN_CONSTRAINTS = {
  sectionCount: HOMEPAGE_SECTION_TYPES.length,
  sectionOrder: { min: 0, max: 20 },
  itemCount: { min: 1, max: 24 },
  title: { maxLength: 120 },
  subtitle: { maxLength: 240 },
  discountBps: { min: 0, max: 9_000 },
  changeReason: { minLength: 3, maxLength: 500 },
} as const;

const localizedCopySchema = z.record(
  z.string().min(2).max(32),
  z.string().max(HOMEPAGE_ADMIN_CONSTRAINTS.subtitle.maxLength),
);

export const homepageOfferOverrideSchema = z
  .object({
    listingId: z.string().min(1).max(160),
    isPinned: z.boolean().default(false),
    isHidden: z.boolean().default(false),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    sortOrder: z.number().int().min(0).max(1_000).optional(),
  })
  .strict();

export type HomepageOfferOverride = z.infer<
  typeof homepageOfferOverrideSchema
>;

export const homepageSectionSettingsSchema = z
  .object({
    selectionMode: z.enum(HOMEPAGE_SELECTION_MODES).optional(),
    eligibleOfferTypes: z.array(z.enum(HOMEPAGE_OFFER_TYPES)).max(4).optional(),
    allowedMarkets: z
      .array(z.string().regex(/^[A-Z]{2}$/))
      .max(32)
      .optional(),
    taxonomyBranches: z.array(z.string().min(1).max(160)).max(100).optional(),
    minimumDiscountBps: z
      .number()
      .int()
      .min(HOMEPAGE_ADMIN_CONSTRAINTS.discountBps.min)
      .max(HOMEPAGE_ADMIN_CONSTRAINTS.discountBps.max)
      .optional(),
    includeProfessionalSellers: z.boolean().optional(),
    previewEmptyState: z.boolean().optional(),
    offerOverrides: z.array(homepageOfferOverrideSchema).max(200).optional(),
  })
  .strict();

export type HomepageSectionSettings = z.infer<
  typeof homepageSectionSettingsSchema
>;

export const homepageSectionConfigurationSchema = z
  .object({
    key: z.enum(HOMEPAGE_SECTION_TYPES),
    type: z.enum(HOMEPAGE_SECTION_TYPES),
    enabled: z.boolean(),
    order: z
      .number()
      .int()
      .min(HOMEPAGE_ADMIN_CONSTRAINTS.sectionOrder.min)
      .max(HOMEPAGE_ADMIN_CONSTRAINTS.sectionOrder.max),
    titleByLocale: localizedCopySchema,
    subtitleByLocale: localizedCopySchema,
    maxItems: z
      .number()
      .int()
      .min(HOMEPAGE_ADMIN_CONSTRAINTS.itemCount.min)
      .max(HOMEPAGE_ADMIN_CONSTRAINTS.itemCount.max),
    mobileVisible: z.boolean(),
    desktopVisible: z.boolean(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    settings: homepageSectionSettingsSchema.default({}),
  })
  .strict()
  .refine((section) => section.key === section.type, {
    message: "Homepage section key and type must match.",
    path: ["key"],
  })
  .refine(
    (section) =>
      !section.startsAt ||
      !section.endsAt ||
      new Date(section.startsAt).getTime() < new Date(section.endsAt).getTime(),
    {
      message: "Homepage section startsAt must be earlier than endsAt.",
      path: ["endsAt"],
    },
  );

export type HomepageSectionConfiguration = z.infer<
  typeof homepageSectionConfigurationSchema
>;

export const homepageConfigurationSchema = z
  .object({
    id: z.string().min(1).max(160),
    marketCode: z.string().regex(/^[A-Z]{2}$/),
    locale: z.string().min(2).max(32),
    revision: z.number().int().positive(),
    state: z.enum(["draft", "published", "archived"]),
    sections: z
      .array(homepageSectionConfigurationSchema)
      .max(HOMEPAGE_ADMIN_CONSTRAINTS.sectionCount),
    updatedAt: z.string().datetime(),
    publishedAt: z.string().datetime().optional(),
    changeReason: z
      .string()
      .min(HOMEPAGE_ADMIN_CONSTRAINTS.changeReason.minLength)
      .max(HOMEPAGE_ADMIN_CONSTRAINTS.changeReason.maxLength)
      .optional(),
  })
  .strict()
  .superRefine((configuration, context) => {
    const keys = new Set<HomepageSectionType>();
    for (const [index, section] of configuration.sections.entries()) {
      if (keys.has(section.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Homepage section keys must be unique.",
          path: ["sections", index, "key"],
        });
      }
      keys.add(section.key);
    }
  });

export type HomepageConfiguration = z.infer<
  typeof homepageConfigurationSchema
>;

export interface ResolvedHomepageSection
  extends Omit<
    HomepageSectionConfiguration,
    "titleByLocale" | "subtitleByLocale"
  > {
  title: string;
  subtitle?: string;
}

export interface ResolvedHomepageConfiguration {
  id: string;
  marketCode: string;
  locale: string;
  revision: number;
  generatedAt: string;
  sections: ResolvedHomepageSection[];
}

const DEFAULT_TITLES: Record<HomepageSectionType, string> = {
  hero: "Trouvez la perle rare, sans tracas.",
  recent_searches: "Recherches récentes",
  trending: "En ce moment sur Shongre",
  deals: "Meilleures offres",
  recent_listings: "Annonces récentes",
  collections: "Collections du moment",
  pro_cta: "Vous êtes commerçant, artisan ou professionnel ?",
};

const DEFAULT_SUBTITLES: Partial<Record<HomepageSectionType, string>> = {
  hero:
    "Achetez et vendez avec un paiement suivi, des options de remise claires et des statuts vendeur explicites.",
  trending: "Découvrez ce qui attire le plus les acheteurs en ce moment.",
  deals: "Des réductions et offres actives sélectionnées pour votre marché.",
  recent_listings: "Les dernières offres publiées près de chez vous.",
  collections:
    "Des sélections thématiques préparées pour dénicher des pépites uniques, durables et vérifiées.",
  pro_cta:
    "Ouvrez votre vitrine officielle, présentez votre catalogue et pilotez votre activité professionnelle.",
};

const DEFAULT_MAX_ITEMS: Record<HomepageSectionType, number> = {
  hero: 8,
  recent_searches: 6,
  trending: 4,
  deals: 6,
  recent_listings: 12,
  collections: 5,
  pro_cta: 1,
};

export function createDefaultHomepageConfiguration(input: {
  marketCode: string;
  locale: string;
  now?: string;
  state?: HomepageConfiguration["state"];
  revision?: number;
}): HomepageConfiguration {
  const marketCode = input.marketCode.trim().toUpperCase();
  const now = input.now ?? new Date().toISOString();
  const order: HomepageSectionType[] = [
    "hero",
    "recent_searches",
    "trending",
    "deals",
    "recent_listings",
    "collections",
    "pro_cta",
  ];
  const sections = order.map((type, index): HomepageSectionConfiguration => ({
    key: type,
    type,
    enabled: true,
    order: index,
    titleByLocale: { [input.locale]: DEFAULT_TITLES[type] },
    subtitleByLocale: {
      [input.locale]: DEFAULT_SUBTITLES[type] ?? "",
    },
    maxItems: DEFAULT_MAX_ITEMS[type],
    mobileVisible: true,
    desktopVisible: true,
    settings:
      type === "trending"
        ? { selectionMode: "hybrid" }
        : type === "deals"
          ? {
              selectionMode: "hybrid",
              eligibleOfferTypes: [...HOMEPAGE_OFFER_TYPES],
              allowedMarkets: [marketCode],
              taxonomyBranches: [],
              minimumDiscountBps: 500,
              includeProfessionalSellers: true,
              previewEmptyState: false,
              offerOverrides: [],
            }
          : {},
  }));

  return homepageConfigurationSchema.parse({
    id: `homepage:${marketCode}:${input.locale}:${input.revision ?? 1}`,
    marketCode,
    locale: input.locale,
    revision: input.revision ?? 1,
    state: input.state ?? "published",
    sections,
    updatedAt: now,
    publishedAt: input.state === "draft" ? undefined : now,
  });
}

export function resolveHomepageConfiguration(
  configuration: HomepageConfiguration,
  now = new Date(),
): ResolvedHomepageConfiguration {
  const locale = configuration.locale;
  const language = locale.split("-")[0] ?? locale;
  const resolveCopy = (copy: Record<string, string>): string =>
    copy[locale] ??
    Object.entries(copy).find(([key]) => key.split("-")[0] === language)?.[1] ??
    copy["fr-FR"] ??
    Object.values(copy)[0] ??
    "";
  const nowMs = now.getTime();

  return {
    id: configuration.id,
    marketCode: configuration.marketCode,
    locale,
    revision: configuration.revision,
    generatedAt: now.toISOString(),
    sections: configuration.sections
      .filter((section) => {
        if (!section.enabled) return false;
        if (section.startsAt && new Date(section.startsAt).getTime() > nowMs)
          return false;
        if (section.endsAt && new Date(section.endsAt).getTime() <= nowMs)
          return false;
        return true;
      })
      .sort((left, right) => left.order - right.order)
      .map(({ titleByLocale, subtitleByLocale, ...section }) => ({
        ...section,
        title: resolveCopy(titleByLocale),
        subtitle: resolveCopy(subtitleByLocale) || undefined,
      })),
  };
}
