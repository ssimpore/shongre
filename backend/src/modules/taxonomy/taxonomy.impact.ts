import type { TaxonomyV4PrivateBundle } from "./taxonomy.bundle.js";
import {
  TAXONOMY_ADMIN_RESOURCES,
  taxonomyRecordKey,
  taxonomyRecords,
} from "./taxonomy.editor.js";

/** Compare both sides so moving a binding also reports its former owner. */
export function taxonomyImpact(
  before: TaxonomyV4PrivateBundle,
  after: TaxonomyV4PrivateBundle,
) {
  const changed = new Map(
    TAXONOMY_ADMIN_RESOURCES.map((resource) => {
      const previous = new Map(
        taxonomyRecords(before, resource).map((row) => [
          taxonomyRecordKey(row, resource),
          row,
        ]),
      );
      const next = new Map(
        taxonomyRecords(after, resource).map((row) => [
          taxonomyRecordKey(row, resource),
          row,
        ]),
      );
      const keys = new Set([...previous.keys(), ...next.keys()]);
      return [
        resource,
        [...keys]
          .filter(
            (key) =>
              JSON.stringify(previous.get(key)) !==
              JSON.stringify(next.get(key)),
          )
          .flatMap((key) =>
            [previous.get(key), next.get(key)].filter(
              (row) => row !== undefined,
            ),
          ),
      ] as const;
    }),
  );
  const ids = (resource: (typeof TAXONOMY_ADMIN_RESOURCES)[number]) =>
    new Set(changed.get(resource)!.map((row) => String(row.id)));
  const categoryIds = ids("categories");
  for (const row of changed.get("discovery")!) categoryIds.add(String(row.id));
  for (const row of changed.get("aliases")!)
    categoryIds.add(String(row.canonicalCategoryId));
  const optionIds = ids("options");
  for (const row of changed.get("optionParentLinks")!) {
    optionIds.add(String(row.optionId));
    optionIds.add(String(row.parentOptionId));
  }
  const optionSets = ids("optionSets");
  const groups = ids("attributeGroups");
  const attributeIds = ids("attributes");
  const listingTypeIds = ids("listingTypes");
  for (const row of changed.get("presentations")!)
    listingTypeIds.add(String(row.id));
  for (const row of changed.get("bindings")!) {
    listingTypeIds.add(String(row.listingTypeId));
    attributeIds.add(String(row.attributeId));
  }
  const changedRules = [
    ...changed.get("dependencies")!,
    ...changed.get("validationRules")!,
  ];
  const matches = (sourceKey: string, scope: string) =>
    scope === "*" ||
    sourceKey === scope ||
    (scope.endsWith(".*") &&
      (sourceKey === scope.slice(0, -2) ||
        sourceKey.startsWith(scope.slice(0, -1))));
  for (const bundle of [before, after]) {
    for (const option of bundle.options)
      if (optionIds.has(option.id)) optionSets.add(option.optionSetId);
    for (const field of bundle.attributes)
      if (
        groups.has(field.groupId) ||
        (field.optionSetId && optionSets.has(field.optionSetId))
      )
        attributeIds.add(field.id);
    const categories = new Map(bundle.categories.map((row) => [row.id, row]));
    const affectedCategory = (id: string) => {
      const visited = new Set<string>();
      let node = categories.get(id);
      while (node && !visited.has(node.id)) {
        if (categoryIds.has(node.id)) return true;
        visited.add(node.id);
        node = node.parentId ? categories.get(node.parentId) : undefined;
      }
      return false;
    };
    for (const type of bundle.listingTypes) {
      if (
        affectedCategory(type.categoryId) ||
        changedRules.some((rule) =>
          (rule.scopes as string[]).some((scope) =>
            matches(
              categories.get(type.categoryId)?.sourceKey ?? type.categoryId,
              scope,
            ),
          ),
        ) ||
        changed.get("referenceData")!.length
      )
        listingTypeIds.add(type.id);
    }
    for (const binding of bundle.bindings)
      if (attributeIds.has(binding.attributeId))
        listingTypeIds.add(binding.listingTypeId);
  }
  return {
    categoryIds: [...categoryIds].sort(),
    listingTypeIds: [...listingTypeIds].sort(),
    attributeIds: [...attributeIds].sort(),
    optionIds: [...optionIds].sort(),
  };
}
