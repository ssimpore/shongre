import type { MarketContext } from "@shongre/contracts";
import type {
  TaxonomyV4Attribute,
  TaxonomyV4ListingIntent,
  TaxonomyV4ListingType,
  TaxonomyV4Node,
  TaxonomyV4ResolvedPublication,
} from "@shongre/contracts/taxonomy";
import {
  TAXONOMY_V4_PRIVATE_BUNDLE,
  type TaxonomyV4PrivateBundle,
} from "./generated/taxonomy-v4.private.js";

export type TaxonomyV4SellerType = "individual" | "professional";

export type TaxonomyV4ErrorCode =
  | "TAXONOMY_VERSION_UNSUPPORTED"
  | "TAXONOMY_CATEGORY_NOT_FOUND"
  | "TAXONOMY_CATEGORY_NOT_PUBLISHABLE"
  | "TAXONOMY_LISTING_TYPE_NOT_FOUND"
  | "TAXONOMY_LISTING_TYPE_AMBIGUOUS"
  | "TAXONOMY_MARKET_UNAVAILABLE"
  | "TAXONOMY_SELLER_INELIGIBLE"
  | "TAXONOMY_UNKNOWN_ATTRIBUTE"
  | "TAXONOMY_REQUIRED_ATTRIBUTE"
  | "TAXONOMY_INVALID_ATTRIBUTE_TYPE"
  | "TAXONOMY_ATTRIBUTE_OUT_OF_RANGE"
  | "TAXONOMY_INVALID_OPTION"
  | "TAXONOMY_INVALID_OPTION_PARENT"
  | "TAXONOMY_ATTRIBUTE_NOT_APPLICABLE"
  | "TAXONOMY_IMMUTABLE_ATTRIBUTE"
  | "TAXONOMY_OPTION_QUERY_INVALID";

export class TaxonomyV4Error extends Error {
  constructor(
    readonly code: TaxonomyV4ErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "TaxonomyV4Error";
  }
}

export interface ResolveTaxonomyV4Input {
  marketContext: MarketContext;
  categoryIdentity: string;
  listingTypeId?: string;
  intent?: TaxonomyV4ListingIntent;
  sellerType: TaxonomyV4SellerType;
  sellerCapabilities?: readonly string[];
  fulfillmentTypes?: readonly string[];
  locale: string;
  taxonomyVersion?: string;
}

export interface TaxonomyV4ResolvedSchema extends TaxonomyV4ResolvedPublication {
  locale: string;
  marketCode: string;
  projections: {
    filters: TaxonomyV4PrivateBundle["projections"]["filters"];
    cardFields: TaxonomyV4PrivateBundle["projections"]["cardFields"];
    detailFields: TaxonomyV4PrivateBundle["projections"]["detailFields"];
    publicationFlow: TaxonomyV4PrivateBundle["projections"]["publicationFlow"];
    search: TaxonomyV4PrivateBundle["projections"]["search"][number] | null;
    seo: TaxonomyV4PrivateBundle["projections"]["seo"][number] | null;
  };
}

export interface ValidateTaxonomyV4PayloadInput extends ResolveTaxonomyV4Input {
  attributes: Record<string, unknown>;
  previousAttributes?: Record<string, unknown>;
  published?: boolean;
}

export interface TaxonomyV4ValidationIssue {
  attributeId: string;
  code: TaxonomyV4ErrorCode;
  message: string;
}

export interface TaxonomyV4ValidationResult {
  valid: boolean;
  issues: TaxonomyV4ValidationIssue[];
}

export interface TaxonomyV4OptionLookupInput {
  optionSetId: string;
  parentOptionId?: string;
  query?: string;
  cursor?: string;
  limit?: number;
}

const PUBLIC_EFFECTS = new Set([
  "SHOW",
  "HIDE",
  "REQUIRE",
  "FILTER_OPTIONS",
  "CLEAR_VALUE",
  "SET_VALUE",
  "SHOW_NOTICE",
  "OPTIONAL",
]);

function isPresent(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function normalizeComparable(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "").toLocaleLowerCase("fr-FR");
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

function triggerMatches(
  rule: TaxonomyV4PrivateBundle["dependencies"][number],
  payload: Record<string, unknown>,
  context: Record<string, unknown>,
): boolean {
  const source = rule.trigger.kind === "attribute" ? payload : context;
  const value = source[rule.trigger.key];
  const normalized = normalizeComparable(value);
  const expected = rule.values.map(normalizeComparable);
  switch (rule.operator) {
    case "always":
      return true;
    case "is_set":
      return isPresent(value);
    case "eq":
      return normalized === expected[0];
    case "neq":
      return normalized !== expected[0];
    case "in":
      return expected.includes(normalized);
    case "contains":
      return Array.isArray(value)
        ? value.map(normalizeComparable).includes(expected[0])
        : normalized.includes(expected[0] ?? "");
    case "contains_any":
      return Array.isArray(value)
        ? value.map(normalizeComparable).some((item) => expected.includes(item))
        : expected.some((item) => normalized.includes(item));
    case "gt":
      return Number(value) > Number(rule.values[0]);
    case "gte":
      return Number(value) >= Number(rule.values[0]);
    case "lte":
      return Number(value) <= Number(rule.values[0]);
    default:
      return false;
  }
}

function valueHasExpectedType(
  attribute: TaxonomyV4Attribute,
  value: unknown,
): boolean {
  switch (attribute.dataType) {
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "decimal":
    case "money":
    case "percent":
    case "number":
    case "range":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "multi_enum":
    case "multi_select":
      return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
      );
    case "media":
    case "document":
      return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
      );
    case "json":
      return value !== undefined;
    case "date":
    case "date_time":
      return typeof value === "string" && !Number.isNaN(Date.parse(value));
    default:
      return typeof value === "string";
  }
}

function sortByOrder<T extends { sortOrder: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) => left.sortOrder - right.sortOrder);
}

export class TaxonomyV4Service {
  private readonly bundle: TaxonomyV4PrivateBundle;
  private readonly categoriesById: Map<string, TaxonomyV4Node>;
  private readonly categoriesBySource: Map<string, TaxonomyV4Node>;
  private readonly categoriesBySlug: Map<string, TaxonomyV4Node>;
  private readonly listingTypesById: Map<string, TaxonomyV4ListingType>;
  private readonly attributesById: Map<string, TaxonomyV4Attribute>;
  private readonly publicAttributeIds: Set<string>;

  constructor(bundle: TaxonomyV4PrivateBundle = TAXONOMY_V4_PRIVATE_BUNDLE) {
    this.bundle = bundle;
    this.categoriesById = new Map(
      bundle.categories.map((category) => [category.id, category]),
    );
    this.categoriesBySource = new Map(
      bundle.categories.map((category) => [category.sourceKey, category]),
    );
    this.categoriesBySlug = new Map(
      bundle.categories.map((category) => [category.slug, category]),
    );
    this.listingTypesById = new Map(
      bundle.listingTypes.map((listingType) => [listingType.id, listingType]),
    );
    this.attributesById = new Map(
      bundle.attributes.map((attribute) => [attribute.id, attribute]),
    );
    const publicGroupIds = new Set(
      bundle.attributeGroups
        .filter((group) => group.public)
        .map((group) => group.id),
    );
    this.publicAttributeIds = new Set(
      bundle.attributes
        .filter(
          (attribute) =>
            publicGroupIds.has(attribute.groupId) &&
            attribute.privacy === "public",
        )
        .map((attribute) => attribute.id),
    );
  }

  getMetadata() {
    return {
      taxonomyVersion: this.bundle.metadata.taxonomyVersion,
      compilerVersion: this.bundle.metadata.compilerVersion,
      checksum: this.bundle.metadata.normalizedSha256,
    } as const;
  }

  listTree(marketContext: MarketContext): TaxonomyV4Node[] {
    const marketCode = this.requireMarket(marketContext);
    return this.bundle.categories.filter((category) => {
      const availability = category.marketAvailability.find(
        (entry) => entry.marketCode === marketCode,
      );
      return category.status === "active" && availability?.marketplaceEnabled;
    });
  }

  listListingTypes(marketContext: MarketContext): TaxonomyV4ListingType[] {
    const marketCode = this.requireMarket(marketContext);
    return this.bundle.listingTypes.filter((listingType) => {
      const availability = listingType.marketAvailability.find(
        (entry) => entry.marketCode === marketCode,
      );
      return (
        listingType.status === "active" && availability?.marketplaceEnabled
      );
    });
  }

  resolve(input: ResolveTaxonomyV4Input): TaxonomyV4ResolvedSchema {
    if (input.taxonomyVersion && input.taxonomyVersion !== "4.0.0") {
      throw new TaxonomyV4Error(
        "TAXONOMY_VERSION_UNSUPPORTED",
        "Version de taxonomie non prise en charge.",
      );
    }
    const marketCode = this.requireMarket(input.marketContext);
    const category = this.resolveCategory(input.categoryIdentity);
    if (category.status !== "active" || !category.publishable) {
      throw new TaxonomyV4Error(
        "TAXONOMY_CATEGORY_NOT_PUBLISHABLE",
        "Cette catégorie ne permet pas la publication.",
      );
    }
    const categoryAvailability = category.marketAvailability.find(
      (entry) => entry.marketCode === marketCode,
    );
    if (!categoryAvailability?.marketplaceEnabled) {
      throw new TaxonomyV4Error(
        "TAXONOMY_MARKET_UNAVAILABLE",
        "Cette catégorie n’est pas disponible sur ce marché.",
      );
    }
    const listingType = this.resolveListingType(category, input);
    const listingTypeAvailability = listingType.marketAvailability.find(
      (entry) => entry.marketCode === marketCode,
    );
    if (
      listingType.status !== "active" ||
      !listingTypeAvailability?.marketplaceEnabled
    ) {
      throw new TaxonomyV4Error(
        "TAXONOMY_MARKET_UNAVAILABLE",
        "Ce type d’annonce n’est pas disponible sur ce marché.",
      );
    }
    const sellerAllowed =
      input.sellerType === "individual"
        ? category.sellerEligibility.individualAllowed &&
          listingType.sellerEligibility.individualAllowed
        : category.sellerEligibility.professionalAllowed &&
          listingType.sellerEligibility.professionalAllowed;
    if (!sellerAllowed) {
      throw new TaxonomyV4Error(
        "TAXONOMY_SELLER_INELIGIBLE",
        "Ce profil vendeur ne peut pas publier ce type d’annonce.",
      );
    }

    const bindings = sortByOrder(
      this.bundle.bindings.filter((binding) => {
        const definition = this.attributesById.get(binding.attributeId);
        const sellerAllowedForAttribute =
          definition &&
          (input.sellerType === "individual"
            ? definition.sellerEligibility.individualAllowed
            : definition.sellerEligibility.professionalAllowed);
        const marketAllowedForAttribute = definition?.marketAvailability.some(
          (availability) =>
            availability.marketCode === marketCode &&
            availability.marketplaceEnabled,
        );
        const sellerAllowedForBinding =
          input.sellerType === "individual"
            ? binding.sellerEligibility.individualAllowed
            : binding.sellerEligibility.professionalAllowed;
        return (
          binding.categoryId === category.id &&
          binding.listingTypeId === listingType.id &&
          binding.publicationVisible &&
          this.publicAttributeIds.has(binding.attributeId) &&
          sellerAllowedForAttribute &&
          sellerAllowedForBinding &&
          marketAllowedForAttribute
        );
      }),
    );
    const attributes = bindings.map((binding) => {
      const definition = this.attributesById.get(binding.attributeId);
      if (!definition) {
        throw new TaxonomyV4Error(
          "TAXONOMY_UNKNOWN_ATTRIBUTE",
          "Le schéma de publication contient un champ inconnu.",
        );
      }
      return {
        definition,
        binding,
        options: definition.optionSetId
          ? sortByOrder(
              this.bundle.options.filter(
                (option) =>
                  option.optionSetId === definition.optionSetId &&
                  option.active,
              ),
            )
          : [],
      };
    });
    const resolvedAttributeIds = new Set(
      attributes.map(({ definition }) => definition.id),
    );
    const dependencyRules = this.bundle.dependencies.filter(
      (rule) =>
        PUBLIC_EFFECTS.has(rule.effect) &&
        scopeMatches(category.sourceKey, rule.scopes) &&
        [rule.trigger, ...rule.targets].every(
          (reference) =>
            reference.kind !== "attribute" ||
            resolvedAttributeIds.has(reference.key),
        ),
    ) as TaxonomyV4ResolvedPublication["dependencyRules"];
    const validationRules = this.bundle.validationRules
      .filter(
        (rule) =>
          rule.status === "draft" &&
          scopeMatches(category.sourceKey, rule.scopes) &&
          (rule.target.kind !== "attribute" ||
            resolvedAttributeIds.has(rule.target.key)),
      )
      .map(
        ({ expression: _expression, ...rule }) => rule,
      ) as TaxonomyV4ResolvedPublication["validationRules"];

    return {
      taxonomyVersion: "4.0.0",
      category,
      listingType,
      attributes,
      dependencyRules,
      validationRules,
      eligible: true,
      locale: input.locale,
      marketCode,
      projections: {
        filters: sortByOrder(
          this.bundle.projections.filters.filter(
            (row) =>
              row.listingTypeId === listingType.id &&
              resolvedAttributeIds.has(row.attributeId),
          ),
        ),
        cardFields: sortByOrder(
          this.bundle.projections.cardFields.filter(
            (row) =>
              row.listingTypeId === listingType.id &&
              (row.field.kind !== "attribute" ||
                resolvedAttributeIds.has(row.field.key)),
          ),
        ),
        detailFields: sortByOrder(
          this.bundle.projections.detailFields.filter(
            (row) =>
              row.listingTypeId === listingType.id &&
              (row.field.kind !== "attribute" ||
                resolvedAttributeIds.has(row.field.key)),
          ),
        ),
        publicationFlow: [...this.bundle.projections.publicationFlow]
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

  validate(input: ValidateTaxonomyV4PayloadInput): TaxonomyV4ValidationResult {
    const schema = this.resolve(input);
    const issues: TaxonomyV4ValidationIssue[] = [];
    const allowed = new Map(
      schema.attributes.map((resolved) => [resolved.definition.id, resolved]),
    );
    for (const attributeId of Object.keys(input.attributes)) {
      if (!allowed.has(attributeId)) {
        issues.push({
          attributeId,
          code: "TAXONOMY_UNKNOWN_ATTRIBUTE",
          message: "Champ non reconnu pour ce type d’annonce.",
        });
      }
    }
    const context = {
      intent: schema.listingType.intent,
      country: schema.marketCode,
      seller_type: input.sellerType,
      fulfillment_model: input.fulfillmentTypes?.[0],
      fulfillment_types: input.fulfillmentTypes ?? [],
      ...(input.sellerCapabilities ?? []).reduce<Record<string, boolean>>(
        (result, capability) => ({ ...result, [capability]: true }),
        {},
      ),
    };
    for (const { definition, binding, options } of schema.attributes) {
      const value = input.attributes[definition.id];
      const fieldRules = schema.dependencyRules.filter((rule) =>
        rule.targets.some(
          (target) =>
            target.kind === "attribute" && target.key === definition.id,
        ),
      );
      const matchingRules = fieldRules.filter((rule) =>
        triggerMatches(rule, input.attributes, context),
      );
      const showRules = fieldRules.filter((rule) => rule.effect === "SHOW");
      const visible =
        !matchingRules.some(
          (rule) => rule.effect === "HIDE" || rule.effect === "CLEAR_VALUE",
        ) &&
        (showRules.length === 0 ||
          matchingRules.some((rule) => rule.effect === "SHOW"));
      if (!visible) {
        if (isPresent(value)) {
          issues.push({
            attributeId: definition.id,
            code: "TAXONOMY_ATTRIBUTE_NOT_APPLICABLE",
            message: "Ce champ ne s’applique pas aux choix actuels.",
          });
        }
        continue;
      }
      const required =
        (binding.required ||
          matchingRules.some((rule) => rule.effect === "REQUIRE")) &&
        !matchingRules.some((rule) => rule.effect === "OPTIONAL");
      if (required && !isPresent(value)) {
        issues.push({
          attributeId: definition.id,
          code: "TAXONOMY_REQUIRED_ATTRIBUTE",
          message: "Ce champ est obligatoire.",
        });
        continue;
      }
      if (!isPresent(value)) continue;
      if (!valueHasExpectedType(definition, value)) {
        issues.push({
          attributeId: definition.id,
          code: "TAXONOMY_INVALID_ATTRIBUTE_TYPE",
          message: "La valeur ne correspond pas au format attendu.",
        });
        continue;
      }
      if (typeof value === "number") {
        if (
          (definition.validation.min !== undefined &&
            value < definition.validation.min) ||
          (definition.validation.max !== undefined &&
            value > definition.validation.max)
        ) {
          issues.push({
            attributeId: definition.id,
            code: "TAXONOMY_ATTRIBUTE_OUT_OF_RANGE",
            message: "La valeur est hors de la plage autorisée.",
          });
        }
      }
      if (options.length > 0) {
        const values = Array.isArray(value) ? value : [value];
        const optionByKey = new Map(
          options.map((option) => [option.key, option]),
        );
        for (const selected of values) {
          const option = optionByKey.get(String(selected));
          if (!option) {
            issues.push({
              attributeId: definition.id,
              code: "TAXONOMY_INVALID_OPTION",
              message: "Option inconnue ou indisponible.",
            });
            continue;
          }
          const parentLinks = this.bundle.optionParentLinks.filter(
            (link) => link.optionId === option.id,
          );
          if (parentLinks.length > 0) {
            const parentSetIds = new Set(
              parentLinks.map((link) => link.parentOptionId.split(":", 1)[0]),
            );
            const parentAttributes = schema.attributes.filter(
              ({ definition: candidate }) =>
                candidate.optionSetId &&
                parentSetIds.has(candidate.optionSetId),
            );
            const hasValidParent = parentAttributes.some(
              ({ definition: parent }) => {
                const parentValue = input.attributes[parent.id];
                const parentValues = Array.isArray(parentValue)
                  ? parentValue.map(String)
                  : [String(parentValue ?? "")];
                return parentLinks.some((link) =>
                  parentValues.includes(
                    link.parentOptionId.split(":").slice(1).join(":"),
                  ),
                );
              },
            );
            if (!hasValidParent) {
              issues.push({
                attributeId: definition.id,
                code: "TAXONOMY_INVALID_OPTION_PARENT",
                message:
                  "Cette option ne correspond pas à la sélection parente.",
              });
            }
          }
        }
      }
      if (
        input.published &&
        definition.immutableAfterPublication &&
        input.previousAttributes &&
        JSON.stringify(input.previousAttributes[definition.id]) !==
          JSON.stringify(value)
      ) {
        issues.push({
          attributeId: definition.id,
          code: "TAXONOMY_IMMUTABLE_ATTRIBUTE",
          message: "Ce champ ne peut plus être modifié après publication.",
        });
      }
    }
    return { valid: issues.length === 0, issues };
  }

  lookupOptions(input: TaxonomyV4OptionLookupInput) {
    const limit = input.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new TaxonomyV4Error(
        "TAXONOMY_OPTION_QUERY_INVALID",
        "La limite doit être comprise entre 1 et 200.",
      );
    }
    const offset = input.cursor ? Number(input.cursor) : 0;
    if (!Number.isInteger(offset) || offset < 0) {
      throw new TaxonomyV4Error(
        "TAXONOMY_OPTION_QUERY_INVALID",
        "Curseur d’options invalide.",
      );
    }
    const allowedOptionIds = input.parentOptionId
      ? new Set(
          this.bundle.optionParentLinks
            .filter((link) => link.parentOptionId === input.parentOptionId)
            .map((link) => link.optionId),
        )
      : null;
    const query = input.query?.trim().toLocaleLowerCase("fr-FR");
    const matches = sortByOrder(
      this.bundle.options.filter(
        (option) =>
          option.optionSetId === input.optionSetId &&
          option.active &&
          (!allowedOptionIds || allowedOptionIds.has(option.id)) &&
          (!query ||
            Object.values(option.labels).some((label) =>
              label.toLocaleLowerCase("fr-FR").includes(query),
            )),
      ),
    );
    const items = matches.slice(offset, offset + limit);
    return {
      items,
      nextCursor:
        offset + items.length < matches.length
          ? String(offset + items.length)
          : undefined,
      total: matches.length,
      taxonomyVersion: "4.0.0" as const,
    };
  }

  private requireMarket(marketContext: MarketContext): string {
    if (marketContext.kind !== "market" || !marketContext.countryCode) {
      throw new TaxonomyV4Error(
        "TAXONOMY_MARKET_UNAVAILABLE",
        "Sélectionnez un marché actif pour continuer.",
      );
    }
    return marketContext.countryCode;
  }

  private resolveCategory(identity: string): TaxonomyV4Node {
    const normalized = identity.trim().toLocaleLowerCase("fr-FR");
    const alias = this.bundle.aliases.find(
      (entry) => entry.alias === normalized,
    );
    const category =
      this.categoriesById.get(identity) ??
      this.categoriesBySource.get(identity) ??
      this.categoriesBySlug.get(normalized) ??
      (alias ? this.categoriesById.get(alias.canonicalCategoryId) : undefined);
    if (!category) {
      throw new TaxonomyV4Error(
        "TAXONOMY_CATEGORY_NOT_FOUND",
        "Catégorie introuvable.",
      );
    }
    return category;
  }

  private resolveListingType(
    category: TaxonomyV4Node,
    input: ResolveTaxonomyV4Input,
  ): TaxonomyV4ListingType {
    if (input.listingTypeId) {
      const listingType = this.listingTypesById.get(input.listingTypeId);
      if (!listingType || listingType.categoryId !== category.id) {
        throw new TaxonomyV4Error(
          "TAXONOMY_LISTING_TYPE_NOT_FOUND",
          "Type d’annonce introuvable pour cette catégorie.",
        );
      }
      if (input.intent && listingType.intent !== input.intent) {
        throw new TaxonomyV4Error(
          "TAXONOMY_LISTING_TYPE_NOT_FOUND",
          "Le type d’annonce ne correspond pas à l’intention demandée.",
        );
      }
      return listingType;
    }
    const candidates = this.bundle.listingTypes.filter(
      (listingType) =>
        listingType.categoryId === category.id &&
        (!input.intent || listingType.intent === input.intent),
    );
    if (candidates.length === 0) {
      throw new TaxonomyV4Error(
        "TAXONOMY_LISTING_TYPE_NOT_FOUND",
        "Aucun type d’annonce ne correspond à cette catégorie.",
      );
    }
    if (candidates.length > 1) {
      throw new TaxonomyV4Error(
        "TAXONOMY_LISTING_TYPE_AMBIGUOUS",
        "Précisez le type d’annonce.",
      );
    }
    return candidates[0];
  }
}

export const taxonomyV4Service = new TaxonomyV4Service();
