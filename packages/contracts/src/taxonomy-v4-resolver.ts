import type { MarketContext } from "./market-country";
import type {
  TaxonomyV4ListingIntent,
  TaxonomyV4OptionPage,
  TaxonomyV4PublicBundle,
  TaxonomyV4ResolvedSchema,
  TaxonomyV4TreeResponse,
} from "./schemas/taxonomy";

export type TaxonomyV4PublicErrorCode =
  | "TAXONOMY_VERSION_UNSUPPORTED"
  | "TAXONOMY_CATEGORY_NOT_FOUND"
  | "TAXONOMY_CATEGORY_NOT_PUBLISHABLE"
  | "TAXONOMY_LISTING_TYPE_NOT_FOUND"
  | "TAXONOMY_LISTING_TYPE_AMBIGUOUS"
  | "TAXONOMY_MARKET_UNAVAILABLE"
  | "TAXONOMY_SELLER_INELIGIBLE"
  | "TAXONOMY_OPTION_QUERY_INVALID";

export class TaxonomyV4PublicError extends Error {
  constructor(
    readonly code: TaxonomyV4PublicErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TaxonomyV4PublicError";
  }
}

export interface ResolveTaxonomyV4PublicInput {
  marketContext: MarketContext;
  categoryIdentity: string;
  listingTypeId?: string;
  intent?: TaxonomyV4ListingIntent;
  sellerType: "individual" | "professional";
  locale: string;
  taxonomyVersion?: string;
}

function requireMarket(input: MarketContext): "FR" | "BE" | "CH" {
  if (
    input.kind !== "market" ||
    (input.countryCode !== "FR" &&
      input.countryCode !== "BE" &&
      input.countryCode !== "CH")
  ) {
    throw new TaxonomyV4PublicError(
      "TAXONOMY_MARKET_UNAVAILABLE",
      "Ce marché n’est pas disponible.",
    );
  }
  return input.countryCode;
}

function scopeMatches(sourceKey: string, scopes: readonly string[]): boolean {
  return scopes.some((scope) => {
    if (scope === "*") return true;
    if (scope.endsWith(".*")) {
      const prefix = scope.slice(0, -2);
      return sourceKey === prefix || sourceKey.startsWith(`${prefix}.`);
    }
    return sourceKey === scope;
  });
}

export class TaxonomyV4PublicResolver {
  constructor(private readonly bundle: TaxonomyV4PublicBundle) {}

  tree(
    marketContext: MarketContext,
    locale: string,
    taxonomyVersion?: string,
  ): TaxonomyV4TreeResponse {
    if (taxonomyVersion && taxonomyVersion !== "4.0.0") {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_VERSION_UNSUPPORTED",
        "Version de taxonomie non prise en charge.",
      );
    }
    const marketCode = requireMarket(marketContext);
    return {
      taxonomyVersion: "4.0.0",
      compilerVersion: this.bundle.metadata.compilerVersion,
      checksum: this.bundle.metadata.normalizedSha256,
      marketCode,
      locale,
      items: this.bundle.categories.filter(
        (category) =>
          category.status === "active" &&
          category.marketAvailability.some(
            (availability) =>
              availability.marketCode === marketCode &&
              availability.marketplaceEnabled,
          ),
      ),
      listingTypes: this.bundle.listingTypes.filter(
        (listingType) =>
          listingType.status === "active" &&
          listingType.marketAvailability.some(
            (availability) =>
              availability.marketCode === marketCode &&
              availability.marketplaceEnabled,
          ),
      ),
    };
  }

  resolve(input: ResolveTaxonomyV4PublicInput): TaxonomyV4ResolvedSchema {
    if (input.taxonomyVersion && input.taxonomyVersion !== "4.0.0") {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_VERSION_UNSUPPORTED",
        "Version de taxonomie non prise en charge.",
      );
    }
    const marketCode = requireMarket(input.marketContext);
    const normalizedIdentity = input.categoryIdentity
      .trim()
      .toLocaleLowerCase("fr-FR");
    const alias = this.bundle.aliases.find(
      (candidate) => candidate.alias === normalizedIdentity,
    );
    const category = this.bundle.categories.find(
      (candidate) =>
        candidate.id === input.categoryIdentity ||
        candidate.sourceKey === input.categoryIdentity ||
        candidate.slug === normalizedIdentity ||
        candidate.id === alias?.canonicalCategoryId,
    );
    if (!category) {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_CATEGORY_NOT_FOUND",
        "Catégorie introuvable.",
      );
    }
    if (category.status !== "active" || !category.publishable) {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_CATEGORY_NOT_PUBLISHABLE",
        "Cette catégorie ne permet pas la publication.",
      );
    }
    const available = category.marketAvailability.some(
      (availability) =>
        availability.marketCode === marketCode &&
        availability.marketplaceEnabled,
    );
    if (!available) {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_MARKET_UNAVAILABLE",
        "Cette catégorie n’est pas disponible sur ce marché.",
      );
    }
    const listingTypes = this.bundle.listingTypes.filter(
      (listingType) =>
        listingType.categoryId === category.id &&
        (!input.listingTypeId || listingType.id === input.listingTypeId) &&
        (!input.intent || listingType.intent === input.intent) &&
        listingType.status === "active" &&
        listingType.marketAvailability.some(
          (availability) =>
            availability.marketCode === marketCode &&
            availability.marketplaceEnabled,
        ),
    );
    if (listingTypes.length === 0) {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_LISTING_TYPE_NOT_FOUND",
        "Type d’annonce introuvable.",
      );
    }
    if (listingTypes.length > 1) {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_LISTING_TYPE_AMBIGUOUS",
        "Précisez le type d’annonce.",
      );
    }
    const listingType = listingTypes[0];
    const sellerAllowed =
      input.sellerType === "individual"
        ? category.sellerEligibility.individualAllowed &&
          listingType.sellerEligibility.individualAllowed
        : category.sellerEligibility.professionalAllowed &&
          listingType.sellerEligibility.professionalAllowed;
    if (!sellerAllowed) {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_SELLER_INELIGIBLE",
        "Ce profil vendeur ne peut pas publier ce type d’annonce.",
      );
    }
    const bindings = this.bundle.bindings
      .filter((binding) => {
        const definition = this.bundle.attributes.find(
          (attribute) => attribute.id === binding.attributeId,
        );
        const sellerAllowedForAttribute =
          definition &&
          (input.sellerType === "individual"
            ? definition.sellerEligibility.individualAllowed
            : definition.sellerEligibility.professionalAllowed);
        const sellerAllowedForBinding =
          input.sellerType === "individual"
            ? binding.sellerEligibility.individualAllowed
            : binding.sellerEligibility.professionalAllowed;
        return (
          binding.categoryId === category.id &&
          binding.listingTypeId === listingType.id &&
          binding.publicationVisible &&
          sellerAllowedForAttribute &&
          sellerAllowedForBinding &&
          definition.marketAvailability.some(
            (availability) =>
              availability.marketCode === marketCode &&
              availability.marketplaceEnabled,
          )
        );
      })
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const attributes = bindings.flatMap((binding) => {
      const definition = this.bundle.attributes.find(
        (attribute) => attribute.id === binding.attributeId,
      );
      if (!definition) return [];
      return [
        {
          definition,
          binding,
          options: definition.optionSetId
            ? this.bundle.options
                .filter(
                  (option) =>
                    option.optionSetId === definition.optionSetId &&
                    option.active,
                )
                .sort((left, right) => left.sortOrder - right.sortOrder)
            : [],
        },
      ];
    });
    const resolvedAttributeIds = new Set(
      attributes.map(({ definition }) => definition.id),
    );
    return {
      taxonomyVersion: "4.0.0",
      category,
      listingType,
      attributes,
      dependencyRules: this.bundle.dependencyRules.filter(
        (rule) =>
          scopeMatches(category.sourceKey, rule.scopes) &&
          [rule.trigger, ...rule.targets].every(
            (reference) =>
              reference.kind !== "attribute" ||
              resolvedAttributeIds.has(reference.key),
          ),
      ),
      validationRules: this.bundle.validationRules.filter(
        (rule) =>
          scopeMatches(category.sourceKey, rule.scopes) &&
          (rule.target.kind !== "attribute" ||
            resolvedAttributeIds.has(rule.target.key)),
      ),
      eligible: true,
      locale: input.locale,
      marketCode,
      projections: {
        filters: this.bundle.projections.filters
          .filter(
            (row) =>
              row.listingTypeId === listingType.id &&
              resolvedAttributeIds.has(row.attributeId),
          )
          .sort((left, right) => left.sortOrder - right.sortOrder),
        cardFields: this.bundle.projections.cardFields
          .filter(
            (row) =>
              row.listingTypeId === listingType.id &&
              (row.field.kind !== "attribute" ||
                resolvedAttributeIds.has(row.field.key)),
          )
          .sort((left, right) => left.sortOrder - right.sortOrder),
        detailFields: this.bundle.projections.detailFields
          .filter(
            (row) =>
              row.listingTypeId === listingType.id &&
              (row.field.kind !== "attribute" ||
                resolvedAttributeIds.has(row.field.key)),
          )
          .sort((left, right) => left.sortOrder - right.sortOrder),
        publicationFlow: this.bundle.projections.publicationFlow
          .filter((row) => row.listingTypeId === listingType.id)
          .sort((left, right) => left.step - right.step)
          .map((row) => ({
            ...row,
            requiredFields: row.requiredFields.filter(
              (field) =>
                field.kind !== "attribute" ||
                resolvedAttributeIds.has(field.key),
            ),
          })),
        search:
          this.bundle.projections.search
            .filter((row) => row.categoryId === category.id)
            .map((row) => ({
              ...row,
              filterableAttributeIds: row.filterableAttributeIds.filter((id) =>
                resolvedAttributeIds.has(id),
              ),
              sortableAttributeIds: row.sortableAttributeIds.filter((id) =>
                resolvedAttributeIds.has(id),
              ),
            }))[0] ?? null,
        seo:
          this.bundle.projections.seo.find(
            (row) => row.categoryId === category.id,
          ) ?? null,
      },
    };
  }

  lookupOptions(input: {
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }): TaxonomyV4OptionPage {
    const limit = input.limit ?? this.bundle.metadata.pagination.defaultLimit;
    const offset = input.cursor ? Number(input.cursor) : 0;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > this.bundle.metadata.pagination.maxLimit ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      throw new TaxonomyV4PublicError(
        "TAXONOMY_OPTION_QUERY_INVALID",
        "Pagination d’options invalide.",
      );
    }
    const childIds = input.parentOptionId
      ? new Set(
          this.bundle.optionParentLinks
            .filter((link) => link.parentOptionId === input.parentOptionId)
            .map((link) => link.optionId),
        )
      : null;
    const query = input.query?.trim().toLocaleLowerCase("fr-FR");
    const matching = this.bundle.options
      .filter(
        (option) =>
          option.optionSetId === input.optionSetId &&
          option.active &&
          (!childIds || childIds.has(option.id)) &&
          (!query ||
            Object.values(option.labels).some((label) =>
              label.toLocaleLowerCase("fr-FR").includes(query),
            )),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const items = matching.slice(offset, offset + limit);
    return {
      items,
      nextCursor:
        offset + items.length < matching.length
          ? String(offset + items.length)
          : undefined,
      total: matching.length,
      taxonomyVersion: "4.0.0",
    };
  }
}
