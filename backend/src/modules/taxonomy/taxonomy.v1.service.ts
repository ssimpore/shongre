import {
  readTaxonomyReferences,
  type ReferenceNamespace,
} from "./taxonomy.references.js";
import type { MarketContext } from "@shongre/contracts";
import type {
  TaxonomyV1Attribute,
  TaxonomyV1ListingIntent,
  TaxonomyV1ListingType,
  TaxonomyV1Node,
  TaxonomyV1ResolvedPublication,
} from "@shongre/contracts/taxonomy";
import type { TaxonomyV1PrivateBundle } from "./taxonomy.bundle.js";
import { projectLocalizedListingCharacteristics } from "./taxonomy.characteristics.js";

export type TaxonomyV1SellerType = "individual" | "professional";

export type TaxonomyV1ErrorCode =
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

export class TaxonomyV1Error extends Error {
  constructor(
    readonly code: TaxonomyV1ErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "TaxonomyV1Error";
  }
}

export interface ResolveTaxonomyV1Input {
  marketContext: MarketContext;
  categoryIdentity: string;
  listingTypeId?: string;
  intent?: TaxonomyV1ListingIntent;
  sellerType: TaxonomyV1SellerType;
  sellerCapabilities?: readonly string[];
  fulfillmentTypes?: readonly string[];
  locale: string;
  taxonomyVersion?: string;
}

export interface TaxonomyV1ResolvedSchema extends TaxonomyV1ResolvedPublication {
  locale: string;
  marketCode: string;
  projections: {
    filters: TaxonomyV1PrivateBundle["projections"]["filters"];
    cardFields: TaxonomyV1PrivateBundle["projections"]["cardFields"];
    detailFields: TaxonomyV1PrivateBundle["projections"]["detailFields"];
    publicationFlow: TaxonomyV1PrivateBundle["projections"]["publicationFlow"];
    search: TaxonomyV1PrivateBundle["projections"]["search"][number] | null;
    seo: TaxonomyV1PrivateBundle["projections"]["seo"][number] | null;
  };
}

export interface ValidateTaxonomyV1PayloadInput extends ResolveTaxonomyV1Input {
  attributes: Record<string, unknown>;
  previousAttributes?: Record<string, unknown>;
  published?: boolean;
}

export interface TaxonomyV1ValidationIssue {
  attributeId: string;
  code: TaxonomyV1ErrorCode;
  message: string;
}

export interface TaxonomyV1ValidationResult {
  valid: boolean;
  issues: TaxonomyV1ValidationIssue[];
}

export interface TaxonomyV1OptionLookupInput {
  optionSetId: string;
  marketContext?: MarketContext;
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
  rule: TaxonomyV1PrivateBundle["dependencies"][number],
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
  attribute: TaxonomyV1Attribute,
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

export class TaxonomyV1Service {
  private readonly bundle: TaxonomyV1PrivateBundle;
  private readonly categoriesById: Map<string, TaxonomyV1Node>;
  private readonly categoriesBySource: Map<string, TaxonomyV1Node>;
  private readonly categoriesBySlug: Map<string, TaxonomyV1Node>;
  private readonly listingTypesById: Map<string, TaxonomyV1ListingType>;
  private readonly attributesById: Map<string, TaxonomyV1Attribute>;
  private readonly publicAttributeIds: Set<string>;

  constructor(
    bundle: TaxonomyV1PrivateBundle,
    readonly revision: number,
    private readonly checksum = bundle.metadata.normalizedSha256,
  ) {
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

  projectIdentity(identity: string, rawBrand?: unknown) {
    const category = this.findCategory(identity);
    if (!category) return undefined;
    const labels = (values: Record<string, string>) => ({
      ...values,
      "fr-FR": values["fr-FR"] ?? "",
    });
    const path: {
      id: string;
      slug: string;
      labels: ReturnType<typeof labels>;
    }[] = [];
    const seen = new Set<string>();
    let current: TaxonomyV1Node | undefined = category;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      path.unshift({
        id: current.id,
        slug: current.slug,
        labels: labels({ ...current.labels, ...current.shortLabels }),
      });
      current = current.parentId
        ? this.findCategory(current.parentId)
        : undefined;
    }
    const root = path[0];
    if (!root) return undefined;
    const brandSets = new Set(
      this.bundle.attributes
        .filter((field) =>
          ["brand", "phone_reference_brand"].includes(field.code),
        )
        .map((field) => field.optionSetId),
    );
    const brand =
      rawBrand == null
        ? undefined
        : this.bundle.options.find(
            (option) =>
              brandSets.has(option.optionSetId) &&
              [option.key, option.id, ...Object.values(option.labels)].some(
                (value) =>
                  value.toLocaleLowerCase("fr-FR") ===
                  String(rawBrand).toLocaleLowerCase("fr-FR"),
              ),
          );
    return {
      revision: this.revision,
      categoryId: category.id,
      categorySlug: category.slug,
      categoryLabels: labels({ ...category.labels, ...category.shortLabels }),
      rootId: root.id,
      rootSlug: root.slug,
      rootLabels: root.labels,
      path,
      ...(brand ? { brandLabels: labels(brand.labels) } : {}),
    };
  }

  projectDomainListing(
    identity: string,
    marketCode: string,
    attributes: Readonly<Record<string, unknown>>,
    referenceValues?: Readonly<
      Record<string, Readonly<Record<string, string>>>
    >,
  ) {
    const identityProjection = this.projectIdentity(identity, attributes.brand);
    if (!identityProjection) return undefined;
    const input = {
      categoryId: identityProjection.categoryId,
      marketCode,
      sellerType: "individual" as const,
      attributes,
      validatedDomainFields: true,
      referenceValues,
    };
    return {
      ...identityProjection,
      cardCharacteristics: projectLocalizedListingCharacteristics(
        input,
        this.bundle,
      ),
      detailCharacteristics: projectLocalizedListingCharacteristics(
        input,
        this.bundle,
        "detail",
      ),
    };
  }

  getReferences<N extends ReferenceNamespace>(
    namespace: N,
    marketCode: string,
    includeInactive = false,
  ) {
    return readTaxonomyReferences(
      this.bundle.referenceEntries,
      namespace,
      marketCode,
      includeInactive,
    );
  }

  getBundle(): TaxonomyV1PrivateBundle {
    return this.bundle;
  }

  getMetadata() {
    return {
      taxonomyVersion: this.bundle.metadata.taxonomyVersion,
      compilerVersion: this.bundle.metadata.compilerVersion,
      checksum: this.checksum,
      revision: this.revision,
    } as const;
  }

  listTree(marketContext: MarketContext): TaxonomyV1Node[] {
    const marketCode = this.requireMarket(marketContext);
    return this.bundle.categories.filter((category) => {
      const availability = category.marketAvailability.find(
        (entry) => entry.marketCode === marketCode,
      );
      return category.status === "active" && availability?.marketplaceEnabled;
    });
  }

  listListingTypes(marketContext: MarketContext): TaxonomyV1ListingType[] {
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

  resolve(input: ResolveTaxonomyV1Input): TaxonomyV1ResolvedSchema {
    if (input.taxonomyVersion && input.taxonomyVersion !== "v1") {
      throw new TaxonomyV1Error(
        "TAXONOMY_VERSION_UNSUPPORTED",
        "Version de taxonomie non prise en charge.",
      );
    }
    const marketCode = this.requireMarket(input.marketContext);
    const category = this.resolveCategory(input.categoryIdentity);
    if (category.status !== "active" || !category.publishable) {
      throw new TaxonomyV1Error(
        "TAXONOMY_CATEGORY_NOT_PUBLISHABLE",
        "Cette catégorie ne permet pas la publication.",
      );
    }
    const categoryAvailability = category.marketAvailability.find(
      (entry) => entry.marketCode === marketCode,
    );
    if (!categoryAvailability?.marketplaceEnabled) {
      throw new TaxonomyV1Error(
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
      throw new TaxonomyV1Error(
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
      throw new TaxonomyV1Error(
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
        throw new TaxonomyV1Error(
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
        rule.status === "draft" &&
        PUBLIC_EFFECTS.has(rule.effect) &&
        scopeMatches(category.sourceKey, rule.scopes) &&
        [rule.trigger, ...rule.targets].every(
          (reference) =>
            reference.kind !== "attribute" ||
            resolvedAttributeIds.has(reference.key),
        ),
    ) as TaxonomyV1ResolvedPublication["dependencyRules"];
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
      ) as TaxonomyV1ResolvedPublication["validationRules"];

    return {
      taxonomyVersion: "v1",
      revision: this.revision,
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

  validate(input: ValidateTaxonomyV1PayloadInput): TaxonomyV1ValidationResult {
    return this.validateResolved(input, this.resolve(input));
  }

  /** Existing broad categories stay broad. Changed fields must be valid for
   * every applicable type; unchanged historical answers remain readable. */
  validateRecordedUpdate(
    input: ValidateTaxonomyV1PayloadInput,
  ): TaxonomyV1ValidationResult {
    const marketCode = this.requireMarket(input.marketContext);
    const category = this.resolveCategory(input.categoryIdentity);
    const types = this.bundle.listingTypes.filter(
      (type) =>
        this.isDescendant(type.categoryId, category.id) &&
        (!input.listingTypeId || type.id === input.listingTypeId) &&
        (!input.intent || type.intent === input.intent) &&
        type.marketAvailability.some(
          (market) =>
            market.marketCode === marketCode && market.marketplaceEnabled,
        ),
    );
    const previous = input.previousAttributes ?? {};
    const changed = new Set(
      [
        ...new Set([
          ...Object.keys(previous),
          ...Object.keys(input.attributes),
        ]),
      ].filter(
        (id) =>
          JSON.stringify(previous[id]) !== JSON.stringify(input.attributes[id]),
      ),
    );
    if (!changed.size) return { valid: true, issues: [] };
    if (!types.length)
      return {
        valid: false,
        issues: [...changed].map((attributeId) => ({
          attributeId,
          code: "TAXONOMY_UNKNOWN_ATTRIBUTE",
          message: "Aucune définition applicable à cette caractéristique.",
        })),
      };
    const issues: TaxonomyV1ValidationIssue[] = [];
    for (const type of types) {
      const fields = this.bundle.bindings
        .filter((binding) => binding.listingTypeId === type.id)
        .flatMap((binding) => {
          const definition = this.attributesById.get(binding.attributeId);
          if (
            !definition ||
            definition.privacy !== "public" ||
            !definition.marketAvailability.some(
              (market) =>
                market.marketCode === marketCode && market.marketplaceEnabled,
            )
          )
            return [];
          return [
            {
              definition,
              binding,
              options: this.bundle.options.filter(
                (option) =>
                  option.optionSetId === definition.optionSetId &&
                  option.active,
              ),
            },
          ];
        });
      const typeCategory = this.resolveCategory(type.categoryId);
      const rules = this.bundle.dependencies.filter(
        (rule) =>
          rule.status === "draft" &&
          PUBLIC_EFFECTS.has(rule.effect) &&
          scopeMatches(typeCategory.sourceKey, rule.scopes),
      ) as TaxonomyV1ResolvedPublication["dependencyRules"];
      const affected = new Set(changed);
      for (let prior = -1; prior !== affected.size;) {
        prior = affected.size;
        for (const rule of rules)
          if (
            rule.trigger.kind === "attribute" &&
            affected.has(rule.trigger.key)
          )
            for (const target of rule.targets)
              if (target.kind === "attribute") affected.add(target.key);
        const parentSets = new Set(
          fields
            .filter(({ definition }) => affected.has(definition.id))
            .map(({ definition }) => definition.optionSetId),
        );
        const parentIds = new Set(
          this.bundle.options
            .filter((option) => parentSets.has(option.optionSetId))
            .map((option) => option.id),
        );
        const childIds = new Set(
          this.bundle.optionParentLinks
            .filter((link) => parentIds.has(link.parentOptionId))
            .map((link) => link.optionId),
        );
        const childSets = new Set(
          this.bundle.options
            .filter((option) => childIds.has(option.id))
            .map((option) => option.optionSetId),
        );
        for (const { definition } of fields)
          if (definition.optionSetId && childSets.has(definition.optionSetId))
            affected.add(definition.id);
      }
      const result = this.validateResolved(
        { ...input, published: true },
        {
          category: typeCategory,
          listingType: type,
          marketCode,
          attributes: fields,
          dependencyRules: rules,
        },
      );
      issues.push(
        ...result.issues.filter((issue) => affected.has(issue.attributeId)),
      );
    }
    const unique = [
      ...new Map(
        issues.map((issue) => [`${issue.attributeId}/${issue.code}`, issue]),
      ).values(),
    ];
    return { valid: unique.length === 0, issues: unique };
  }

  private validateResolved(
    input: ValidateTaxonomyV1PayloadInput,
    schema: Pick<
      TaxonomyV1ResolvedSchema,
      | "category"
      | "listingType"
      | "marketCode"
      | "attributes"
      | "dependencyRules"
    >,
  ): TaxonomyV1ValidationResult {
    const issues: TaxonomyV1ValidationIssue[] = [];
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
            const parentOptions = parentLinks.flatMap((link) =>
              this.bundle.options.filter(
                (candidate) => candidate.id === link.parentOptionId,
              ),
            );
            const parentSetIds = new Set(
              parentOptions.map((option) => option.optionSetId),
            );
            // Alternatives within one set are OR; independent dimensions are AND.
            const hasValidParent = [...parentSetIds].every((setId) =>
              schema.attributes.some(({ definition: parent }) => {
                if (parent.optionSetId !== setId) return false;
                const value = input.attributes[parent.id];
                const selected = Array.isArray(value)
                  ? value.map(String)
                  : [String(value ?? "")];
                return parentOptions.some(
                  (option) =>
                    option.optionSetId === setId &&
                    selected.includes(option.key),
                );
              }),
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

  private publicOptionSetIds(marketCode?: string) {
    return new Set(
      this.bundle.attributes
        .filter(
          (field) =>
            this.publicAttributeIds.has(field.id) &&
            field.optionSetId &&
            (!marketCode ||
              field.marketAvailability.some(
                (market) =>
                  market.marketCode === marketCode &&
                  market.status === "active" &&
                  market.marketplaceEnabled,
              )),
        )
        .map((field) => field.optionSetId),
    );
  }

  getOptionSets(marketCode: string, optionSetIds: readonly string[]) {
    const available = this.publicOptionSetIds(marketCode);
    return {
      revision: this.revision,
      optionSets: Object.fromEntries(
        optionSetIds.map((optionSetId) => [
          optionSetId,
          available.has(optionSetId)
            ? sortByOrder(
                this.bundle.options.filter(
                  (option) =>
                    option.optionSetId === optionSetId && option.active,
                ),
              )
            : [],
        ]),
      ),
    };
  }

  lookupOptions(input: TaxonomyV1OptionLookupInput) {
    const marketCode = input.marketContext
      ? this.requireMarket(input.marketContext)
      : undefined;
    if (!this.publicOptionSetIds(marketCode).has(input.optionSetId)) {
      throw new TaxonomyV1Error(
        "TAXONOMY_OPTION_QUERY_INVALID",
        "Ce référentiel public est indisponible.",
      );
    }
    const limit = input.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new TaxonomyV1Error(
        "TAXONOMY_OPTION_QUERY_INVALID",
        "La limite doit être comprise entre 1 et 200.",
      );
    }
    const offset = input.cursor ? Number(input.cursor) : 0;
    if (!Number.isInteger(offset) || offset < 0) {
      throw new TaxonomyV1Error(
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
      taxonomyVersion: "v1" as const,
      revision: this.revision,
    };
  }

  private requireMarket(marketContext: MarketContext): string {
    if (marketContext.kind !== "market" || !marketContext.countryCode) {
      throw new TaxonomyV1Error(
        "TAXONOMY_MARKET_UNAVAILABLE",
        "Sélectionnez un marché actif pour continuer.",
      );
    }
    return marketContext.countryCode;
  }

  findCategory(identity: string): TaxonomyV1Node | undefined {
    const normalized = identity.trim().toLocaleLowerCase("fr-FR");
    const alias = this.bundle.aliases.find(
      (entry) => entry.alias === normalized,
    );
    const category =
      this.categoriesById.get(identity) ??
      this.categoriesBySource.get(identity) ??
      this.categoriesBySlug.get(normalized) ??
      (alias ? this.categoriesById.get(alias.canonicalCategoryId) : undefined);
    return category;
  }

  isDescendant(identity: string, ancestorIdentity: string): boolean {
    const ancestor = this.findCategory(ancestorIdentity);
    let node = this.findCategory(identity);
    const visited = new Set<string>();
    while (node && !visited.has(node.id)) {
      if (node.id === ancestor?.id) return true;
      visited.add(node.id);
      node = node.parentId ? this.categoriesById.get(node.parentId) : undefined;
    }
    return false;
  }

  private resolveCategory(identity: string): TaxonomyV1Node {
    const node = this.findCategory(identity);
    if (!node)
      throw new TaxonomyV1Error(
        "TAXONOMY_CATEGORY_NOT_FOUND",
        "Catégorie introuvable.",
      );
    return node;
  }

  private resolveListingType(
    category: TaxonomyV1Node,
    input: ResolveTaxonomyV1Input,
  ): TaxonomyV1ListingType {
    if (input.listingTypeId) {
      const listingType = this.listingTypesById.get(input.listingTypeId);
      if (!listingType || listingType.categoryId !== category.id) {
        throw new TaxonomyV1Error(
          "TAXONOMY_LISTING_TYPE_NOT_FOUND",
          "Type d’annonce introuvable pour cette catégorie.",
        );
      }
      if (input.intent && listingType.intent !== input.intent) {
        throw new TaxonomyV1Error(
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
      throw new TaxonomyV1Error(
        "TAXONOMY_LISTING_TYPE_NOT_FOUND",
        "Aucun type d’annonce ne correspond à cette catégorie.",
      );
    }
    if (candidates.length > 1) {
      throw new TaxonomyV1Error(
        "TAXONOMY_LISTING_TYPE_AMBIGUOUS",
        "Précisez le type d’annonce.",
      );
    }
    return candidates[0];
  }
}
