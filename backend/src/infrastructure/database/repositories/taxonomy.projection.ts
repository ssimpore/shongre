import type { Category } from "../../../shared/types/index.js";
import type { TaxonomyHeaderNavigationConfiguration } from "@shongre/contracts/taxonomy";
import type { TaxonomyV1PrivateBundle } from "../../../modules/taxonomy/taxonomy.bundle.js";
import type { TaxonomyNode, TaxonomyAttribute } from "./taxonomy.repository.js";

export function createTaxonomyProjection(bundle: TaxonomyV1PrivateBundle) {
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

  function categoryToSummary(
    category: (typeof bundle.categories)[number],
  ): Category {
    const children = bundle.categories
      .filter((candidate) => candidate.parentId === category.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(categoryToSummary);
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

  function searchAttributesForCategory(
    categoryIdentity: string,
  ): TaxonomyAttribute[] {
    const categoryId = canonicalCategoryId(categoryIdentity);
    const belongsToBranch = (id: string): boolean => {
      const visited = new Set<string>();
      let node = categoriesById.get(id);
      while (node && !visited.has(node.id)) {
        if (node.id === categoryId) return true;
        visited.add(node.id);
        node = node.parentId ? categoriesById.get(node.parentId) : undefined;
      }
      return false;
    };
    const typeIds = new Set(
      bundle.listingTypes
        .filter(
          (type) =>
            type.status === "active" && belongsToBranch(type.categoryId),
        )
        .map((type) => type.id),
    );
    const projectedFields = new Set(
      bundle.projections.filters
        .filter((filter) => typeIds.has(filter.listingTypeId))
        .map((filter) => filter.attributeId),
    );
    const bindings = bundle.bindings
      .filter(
        (binding) =>
          typeIds.has(binding.listingTypeId) &&
          binding.filterable &&
          projectedFields.has(binding.attributeId) &&
          publicAttributesById.has(binding.attributeId),
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
          label: attribute.labels["fr-FR"],
          labels: attribute.labels,
          dataType: attribute.dataType,
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
    searchAttributesForCategory,
    getRootCategories: () =>
      bundle.categories
        .filter((node) => !node.parentId && node.status === "active")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(categoryToSummary),
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
