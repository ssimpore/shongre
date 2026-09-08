import type { Category } from "../../../shared/types/index.js";
import type { TaxonomyHeaderNavigationConfiguration } from "@shongre/contracts/taxonomy";
import type { TaxonomyV4PrivateBundle } from "../../../modules/taxonomy/taxonomy.bundle.js";
import type { TaxonomyNode, TaxonomyAttribute } from "./taxonomy.repository.js";

export function createTaxonomyProjection(bundle: TaxonomyV4PrivateBundle) {
  const categoriesById = new Map(
    bundle.categories.map((category) => [category.id, category]),
  );
  const publicGroupIds = new Set(
    bundle.attributeGroups
      .filter((group) => group.public)
      .map((group) => group.id),
  );
  const publicAttributesById = new Map(
    bundle.attributes
      .filter(
        (attribute) =>
          publicGroupIds.has(attribute.groupId) &&
          attribute.privacy === "public",
      )
      .map((attribute) => [attribute.id, attribute]),
  );
  const aliases = new Map(
    bundle.aliases.map((alias) => [alias.alias, alias.canonicalCategoryId]),
  );
  function canonicalCategoryId(identity: string): string {
    if (categoriesById.has(identity)) return identity;
    const normalized = identity.trim().toLocaleLowerCase("fr-FR");
    const direct = bundle.categories.find(
      (category) =>
        category.slug === normalized || category.sourceKey === identity,
    );
    return direct?.id ?? aliases.get(normalized) ?? identity;
  }

  function rootIdFor(categoryId: string): string {
    let current = categoriesById.get(categoryId);
    while (current?.parentId) current = categoriesById.get(current.parentId);
    return current?.id ?? categoryId;
  }

  function listingFamilyFor(categoryId: string): string {
    const rootId = rootIdFor(categoryId);
    if (rootId === "vehicles") return "vehicle";
    if (rootId === "real_estate") return "real_estate";
    if (rootId === "jobs") return "job";
    if (rootId === "services" || rootId === "education") return "service";
    if (
      rootId === "professional_equipment" ||
      rootId === "agriculture" ||
      rootId === "energy_transition"
    ) {
      return "professional_equipment";
    }
    return "physical_product";
  }

  function categoryToTaxonomyNode(
    category: (typeof bundle.categories)[number],
  ): TaxonomyNode {
    return {
      id: category.id,
      code: category.sourceKey,
      slug: category.slug,
      name: category.labels["fr-FR"],
      labels: category.labels,
      shortLabels: category.shortLabels,
      shortLabel: category.shortLabels["fr-FR"],
      parentId: category.parentId,
      iconName: category.iconName,
      sortOrder: category.sortOrder,
      isActive: category.status === "active",
      status: category.status,
      level:
        category.level === 0
          ? "category"
          : category.level === 1
            ? "subcategory"
            : "type",
      publishable: category.publishable,
      listingFamily: listingFamilyFor(category.id),
      supportedIntents: [
        ...new Set(
          bundle.listingTypes
            .filter((listingType) => listingType.categoryId === category.id)
            .map((listingType) => listingType.intent),
        ),
      ],
    };
  }

  function categoryToHeaderItem(
    category: (typeof bundle.categories)[number],
    isActive: boolean,
    displayOrder: number,
  ): TaxonomyHeaderNavigationConfiguration["items"][number] {
    return {
      categoryId: category.id,
      slug: category.slug,
      labels: category.labels,
      shortLabels: category.shortLabels,
      iconName: category.iconName,
      isActive,
      displayOrder,
    };
  }

  function categoryToLegacyCategory(
    category: (typeof bundle.categories)[number],
  ): Category {
    const children = bundle.categories
      .filter((candidate) => candidate.parentId === category.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(categoryToLegacyCategory);
    return {
      id: category.id,
      slug: category.slug,
      name: category.labels["fr-FR"],
      labels: category.labels,
      shortLabels: category.shortLabels,
      shortLabel: category.shortLabels["fr-FR"],
      parentId: category.parentId,
      iconName: category.iconName,
      sortOrder: category.sortOrder,
      isActive: category.status === "active",
      subcategories: children.length > 0 ? children : undefined,
    };
  }

  function publicAttributesForCategory(
    categoryIdentity: string,
  ): TaxonomyAttribute[] {
    const categoryId = canonicalCategoryId(categoryIdentity);
    const defaultListingType = bundle.listingTypes
      .filter(
        (listingType) =>
          listingType.categoryId === categoryId &&
          listingType.status === "active" &&
          listingType.sellerEligibility.individualAllowed,
      )
      .sort((left, right) => {
        const intentOrder = ["SELL", "SERVICE_OFFER", "JOB_OFFER", "BOOK"];
        const leftOrder = intentOrder.indexOf(left.intent);
        const rightOrder = intentOrder.indexOf(right.intent);
        return (
          (leftOrder === -1 ? intentOrder.length : leftOrder) -
            (rightOrder === -1 ? intentOrder.length : rightOrder) ||
          left.id.localeCompare(right.id)
        );
      })[0];
    const bindings = bundle.bindings
      .filter(
        (binding) =>
          binding.categoryId === categoryId &&
          (!defaultListingType ||
            binding.listingTypeId === defaultListingType.id) &&
          binding.publicationVisible &&
          binding.sellerEligibility.individualAllowed &&
          publicAttributesById.has(binding.attributeId) &&
          publicAttributesById.get(binding.attributeId)?.sellerEligibility
            .individualAllowed,
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const bindingByAttributeId = new Map(
      bindings.map((binding) => [binding.attributeId, binding]),
    );
    const attributeIds = [
      ...new Set(bindings.map((binding) => binding.attributeId)),
    ];
    return attributeIds.flatMap((attributeId) => {
      const attribute = publicAttributesById.get(attributeId);
      if (!attribute) return [];
      const options = attribute.optionSetId
        ? bundle.options
            .filter(
              (option) =>
                option.optionSetId === attribute.optionSetId && option.active,
            )
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((option) => ({
              value: option.key,
              label: option.labels["fr-FR"],
              labels: option.labels,
            }))
        : undefined;
      return [
        {
          id: attribute.id,
          code: attribute.code,
          name: attribute.code,
          label: attribute.labels["fr-FR"],
          labels: attribute.labels,
          dataType: attribute.dataType,
          type: attribute.dataType,
          unit: attribute.unit,
          required: bindingByAttributeId.get(attribute.id)?.required ?? false,
          filterable: attribute.filterable,
          searchable: attribute.searchable,
          sortable: attribute.sortable,
          options,
          validation: {
            min: attribute.validation.min,
            max: attribute.validation.max,
          },
          displayOrder: attribute.defaultDisplayOrder,
          defaultValue: attribute.defaultValue,
          privacy: attribute.privacy,
        },
      ];
    });
  }

  return {
    categoriesById,
    canonicalCategoryId,
    categoryToTaxonomyNode,
    categoryToHeaderItem,
    publicAttributesForCategory,
    getRootCategories: () =>
      bundle.categories
        .filter((node) => !node.parentId && node.status === "active")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(categoryToLegacyCategory),
    getNode: (identity: string) => {
      const node = categoriesById.get(canonicalCategoryId(identity));
      return node ? categoryToTaxonomyNode(node) : null;
    },
    getChildren: (identity: string) =>
      bundle.categories
        .filter((node) => node.parentId === canonicalCategoryId(identity))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(categoryToTaxonomyNode),
  };
}
