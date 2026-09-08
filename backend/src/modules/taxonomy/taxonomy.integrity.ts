import type { TaxonomyV4PrivateBundle } from "./taxonomy.bundle.js";
import type { components } from "@shongre/contracts/openapi";

type Issue = components["schemas"]["TaxonomyReviewIssue"];

/** Structural validity is distinct from subject-matter and regulatory review. */
export function inspectTaxonomy(bundle: TaxonomyV4PrivateBundle) {
  const issues: Issue[] = [];
  const warnings: Issue[] = [];
  const add = (code: string, resource: string, id: string, message: string) =>
    issues.push({ code, resource, id, message });
  const nodes = new Map(bundle.categories.map((row) => [row.id, row]));
  const types = new Map(bundle.listingTypes.map((row) => [row.id, row]));
  const fields = new Map(bundle.attributes.map((row) => [row.id, row]));
  const groups = new Set(bundle.attributeGroups.map((row) => row.id));
  const sets = new Set(bundle.optionSets.map((row) => row.id));
  const options = new Map(bundle.options.map((row) => [row.id, row]));
  for (const [resource, rows] of Object.entries(bundle)) {
    if (!Array.isArray(rows)) continue;
    const ids = new Set<string>();
    for (const row of rows) {
      const id =
        "id" in row
          ? String(row.id)
          : "alias" in row
            ? String(row.alias)
            : undefined;
      if (!id) continue;
      if (ids.has(id))
        add("duplicate_identity", resource, id, "Identifiant dupliqué.");
      ids.add(id);
    }
  }
  const slugs = new Set<string>();
  for (const node of bundle.categories) {
    if (slugs.has(node.slug))
      add("duplicate_slug", "categories", node.id, "URL déjà utilisée.");
    slugs.add(node.slug);
    if (
      node.parentId &&
      (!nodes.has(node.parentId) ||
        nodes.get(node.parentId)!.level + 1 !== node.level)
    )
      add(
        "invalid_parent",
        "categories",
        node.id,
        "Parent absent ou profondeur incohérente.",
      );
    if (!node.parentId && node.level !== 0)
      add(
        "invalid_root",
        "categories",
        node.id,
        "Une racine doit être au premier niveau.",
      );
    if (
      node.publishable &&
      bundle.categories.some(
        (child) => child.parentId === node.id && child.status === "active",
      )
    )
      add(
        "publishable_parent",
        "categories",
        node.id,
        "Un nœud publiable possède des enfants actifs.",
      );
    if (
      node.publishable &&
      node.status === "active" &&
      !bundle.listingTypes.some(
        (type) => type.categoryId === node.id && type.status === "active",
      )
    )
      add(
        "missing_listing_type",
        "categories",
        node.id,
        "Aucun type de publication actif.",
      );
  }
  for (const type of bundle.listingTypes)
    if (!nodes.has(type.categoryId))
      add("missing_category", "listingTypes", type.id, "Catégorie absente.");
  for (const field of bundle.attributes) {
    if (
      !groups.has(field.groupId) ||
      (field.optionSetId && !sets.has(field.optionSetId))
    )
      add(
        "missing_field_reference",
        "attributes",
        field.id,
        "Groupe ou jeu d’options absent.",
      );
    if (
      field.validation.min !== undefined &&
      field.validation.max !== undefined &&
      field.validation.min > field.validation.max
    )
      add("invalid_bounds", "attributes", field.id, "Bornes incohérentes.");
    if (
      field.optionSetId &&
      !bundle.options.some(
        (option) => option.optionSetId === field.optionSetId && option.active,
      )
    )
      warnings.push({
        code: "unpopulated_reference",
        resource: "attributes",
        id: field.id,
        message:
          "Référentiel non renseigné : saisie libre existante à examiner.",
      });
  }
  const effective = new Set<string>();
  for (const binding of bundle.bindings) {
    const key = `${binding.categoryId}/${binding.listingTypeId}/${binding.attributeId}`;
    if (effective.has(key))
      add(
        "duplicate_binding",
        "bindings",
        binding.id,
        "Liaison effective dupliquée.",
      );
    effective.add(key);
    if (
      types.get(binding.listingTypeId)?.categoryId !== binding.categoryId ||
      !fields.has(binding.attributeId) ||
      !groups.has(binding.groupId)
    )
      add(
        "invalid_binding",
        "bindings",
        binding.id,
        "Référence de liaison invalide.",
      );
  }
  for (const option of bundle.options)
    if (!sets.has(option.optionSetId))
      add("missing_option_set", "options", option.id, "Jeu d’options absent.");
  const parents = new Map<string, string[]>();
  for (const link of bundle.optionParentLinks) {
    if (
      !options.has(link.optionId) ||
      !options.has(link.parentOptionId) ||
      link.optionId === link.parentOptionId
    )
      add(
        "invalid_option_parent",
        "optionParentLinks",
        link.optionId,
        "Parent d’option invalide.",
      );
    parents.set(link.optionId, [
      ...(parents.get(link.optionId) ?? []),
      link.parentOptionId,
    ]);
  }
  const visited = new Set<string>();
  const visit = (id: string, path: Set<string>) => {
    if (path.has(id)) {
      add(
        "option_cycle",
        "optionParentLinks",
        id,
        "Cycle de dépendance d’options.",
      );
      return;
    }
    if (visited.has(id)) return;
    const next = new Set(path).add(id);
    for (const parent of parents.get(id) ?? []) visit(parent, next);
    visited.add(id);
  };
  for (const id of parents.keys()) visit(id, new Set());
  for (const alias of bundle.aliases)
    if (!nodes.has(alias.canonicalCategoryId))
      add("invalid_alias", "aliases", alias.alias, "Cible d’alias absente.");
  for (const [resource, projections] of Object.entries(bundle.projections)) {
    for (const projection of projections) {
      if (
        !nodes.has(projection.categoryId) ||
        ("listingTypeId" in projection &&
          types.get(projection.listingTypeId)?.categoryId !==
            projection.categoryId)
      )
        add(
          "invalid_projection_owner",
          resource,
          projection.categoryId,
          "Propriétaire de projection invalide.",
        );
      const references =
        "field" in projection
          ? [projection.field]
          : "requiredFields" in projection
            ? projection.requiredFields
            : [];
      if (
        references.some(
          (field) => field.kind === "attribute" && !fields.has(field.key),
        ) ||
        ("attributeId" in projection && !fields.has(projection.attributeId))
      )
        add(
          "invalid_projection_field",
          resource,
          projection.categoryId,
          "Champ de projection absent.",
        );
    }
  }
  for (const rule of bundle.dependencies) {
    for (const field of [rule.trigger, ...rule.targets])
      if (field.kind === "attribute" && !fields.has(field.key))
        add(
          "invalid_dependency",
          "dependencies",
          rule.id,
          "Champ de dépendance absent.",
        );
  }
  for (const type of bundle.listingTypes.filter(
    (row) => row.status === "active",
  )) {
    for (const key of [
      "publicationFlow",
      "detailFields",
      "cardFields",
    ] as const)
      if (!bundle.projections[key].some((row) => row.listingTypeId === type.id))
        warnings.push({
          code: "missing_projection",
          resource: key,
          id: type.id,
          message: "Projection absente : examen du parcours requis.",
        });
  }
  for (const reference of bundle.referenceData)
    if (reference.status !== "VERIFIED")
      warnings.push({
        code: "reference_review_required",
        resource: "referenceData",
        id: String(reference.id),
        message:
          "Référentiel incomplet ou non vérifié : examiner sa couverture et ses sources.",
      });
  return {
    issues,
    warnings,
    counts: {
      categories: bundle.categories.length,
      leaves: bundle.categories.filter(
        (row) => row.publishable && row.status === "active",
      ).length,
      listingTypes: bundle.listingTypes.length,
      attributes: bundle.attributes.length,
      options: bundle.options.length,
      bindings: bundle.bindings.length,
    },
  };
}
