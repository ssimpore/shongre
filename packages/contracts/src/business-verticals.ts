import type {
  BusinessVerticalCode,
  CommercialPlanProfile,
  MonetizationCatalog,
} from "./schemas/monetization";

/** Canonical business dimensions. Course entities deliberately keep `course.*`. */
export const BUSINESS_VERTICAL_IDS = {
  education: "education",
} as const satisfies Record<string, BusinessVerticalCode>;

export const LEGACY_BUSINESS_VERTICAL_ALIASES = {
  cours: BUSINESS_VERTICAL_IDS.education,
} as const satisfies Record<string, BusinessVerticalCode>;

export function normalizeBusinessVerticalCode(
  value: string,
): BusinessVerticalCode;
export function normalizeBusinessVerticalCode(
  value: null | undefined,
): undefined;
export function normalizeBusinessVerticalCode(
  value: string | null | undefined,
): BusinessVerticalCode | undefined;
export function normalizeBusinessVerticalCode(
  value: string | null | undefined,
): BusinessVerticalCode | undefined {
  if (!value) return undefined;
  return (LEGACY_BUSINESS_VERTICAL_ALIASES[
    value as keyof typeof LEGACY_BUSINESS_VERTICAL_ALIASES
  ] ?? value) as BusinessVerticalCode;
}

export function isSameBusinessVertical(
  left: string | undefined,
  right: string | undefined,
): boolean {
  return (
    normalizeBusinessVerticalCode(left) === normalizeBusinessVerticalCode(right)
  );
}

/**
 * Product IDs and provider references stay immutable, but current commercial
 * families use the canonical vertical dimension.
 */
export function normalizeBusinessVerticalFamilyId(familyId: string): string {
  if (familyId === "vertical.cours") return "vertical.education";
  if (familyId.startsWith("vertical.cours.")) {
    return `vertical.education.${familyId.slice("vertical.cours.".length)}`;
  }
  return familyId;
}

export const EDUCATION_FINANCE_CATEGORY = "education_subscription" as const;
export const LEGACY_EDUCATION_FINANCE_CATEGORY =
  "courses_subscription" as const;

export function normalizeFinanceCategory(category: string): string {
  return category === LEGACY_EDUCATION_FINANCE_CATEGORY
    ? EDUCATION_FINANCE_CATEGORY
    : category;
}

/** Compatibility for legacy vertical-prefixed keys; semantic course keys stay unchanged. */
export function normalizeEducationEntitlementKey(key: string): string {
  if (key === "cours") return "education";
  if (key.startsWith("cours."))
    return `education.${key.slice("cours.".length)}`;
  return key;
}

function educationPresentation(value: string): string {
  return value
    .replaceAll("Shongre Cours", "Shongre Education")
    .replaceAll("Visibilité locale Cours", "Visibilité locale Éducation")
    .replaceAll("Option commerciale Cours", "Option commerciale Éducation")
    .replaceAll("Réservations Cours", "Réservations Education")
    .replaceAll("Réservation Cours", "Réservation Education");
}

/**
 * Projects published legacy snapshots into the canonical live dimension.
 * The stored snapshot and every immutable product/version/provider ID stay
 * untouched; this is deliberately a read model, not a history rewrite.
 */
export function normalizeEducationMonetizationCatalog(
  catalog: MonetizationCatalog,
): MonetizationCatalog {
  const verticals = new Map(
    catalog.verticals.map((vertical) => {
      const id = normalizeBusinessVerticalCode(vertical.id);
      return [
        id,
        {
          ...vertical,
          id,
          ...(id === BUSINESS_VERTICAL_IDS.education
            ? { name: "Éducation" }
            : {}),
        },
      ];
    }),
  );

  return {
    ...catalog,
    verticals: [...verticals.values()],
    products: catalog.products.map((product) => ({
      ...product,
      name: educationPresentation(product.name),
      description: educationPresentation(product.description),
      scope: {
        ...product.scope,
        verticalIds: product.scope.verticalIds.map((verticalId) =>
          normalizeBusinessVerticalCode(verticalId),
        ),
      },
      entitlements: product.entitlements.map((entitlement) => ({
        ...entitlement,
        key: normalizeEducationEntitlementKey(entitlement.key),
        ...(entitlement.verticalId
          ? {
              verticalId: normalizeBusinessVerticalCode(entitlement.verticalId),
            }
          : {}),
      })),
      commercialProfile: {
        ...product.commercialProfile,
        familyId: normalizeBusinessVerticalFamilyId(
          product.commercialProfile.familyId,
        ),
        ...(product.commercialProfile.verticalId
          ? {
              verticalId: normalizeBusinessVerticalCode(
                product.commercialProfile.verticalId,
              ),
            }
          : {}),
        financeCategory: normalizeFinanceCategory(
          product.commercialProfile.financeCategory,
        ) as CommercialPlanProfile["financeCategory"],
      },
    })),
    promotions: catalog.promotions.map((promotion) => ({
      ...promotion,
      verticalIds: [
        ...new Set(
          promotion.verticalIds.map((verticalId) =>
            normalizeBusinessVerticalCode(verticalId),
          ),
        ),
      ],
    })),
    commissionPolicies: catalog.commissionPolicies.map((policy) => ({
      ...policy,
      name: educationPresentation(policy.name),
      description: educationPresentation(policy.description),
      rules: policy.rules.map((rule) => ({
        ...rule,
        name: educationPresentation(rule.name),
        description: educationPresentation(rule.description),
        scope: {
          ...rule.scope,
          verticalIds: [
            ...new Set(
              rule.scope.verticalIds.map((verticalId) =>
                normalizeBusinessVerticalCode(verticalId),
              ),
            ),
          ],
        },
      })),
    })),
  };
}
