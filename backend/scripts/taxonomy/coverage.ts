import type { TaxonomyV1PrivateBundle } from "../../src/modules/taxonomy/taxonomy.bundle.js";

/** Import-review evidence only. Runtime consumers never read these reports. */
export function taxonomyCoverage(bundle: TaxonomyV1PrivateBundle) {
  const nodes = new Map(bundle.categories.map((node) => [node.id, node]));
  const branch = (id: string) => {
    const path: string[] = [];
    const visited = new Set<string>();
    let node = nodes.get(id);
    while (node && !visited.has(node.id)) {
      visited.add(node.id);
      path.unshift(node.id);
      node = node.parentId ? nodes.get(node.parentId) : undefined;
    }
    return path;
  };
  const leaves = bundle.categories
    .filter((node) => node.publishable)
    .map((node) => {
      const path = branch(node.id);
      const types = bundle.listingTypes.filter(
        (type) => type.categoryId === node.id,
      );
      const bindings = bundle.bindings.filter(
        (binding) => binding.categoryId === node.id,
      );
      const ids = new Set(bindings.map((binding) => binding.attributeId));
      const referenceReviews = bundle.referenceData.filter(
        (reference) => reference.domain === path[0],
      );
      const dependencies = bundle.dependencies.filter((rule) =>
        rule.scopes.some(
          (scope) =>
            scope === "GLOBAL" ||
            scope === "ALL" ||
            node.sourceKey === scope ||
            node.sourceKey.startsWith(`${scope}.`),
        ),
      );
      const validations = bundle.validationRules.filter((rule) =>
        rule.scopes.some(
          (scope) =>
            scope === "GLOBAL" ||
            scope === "ALL" ||
            node.sourceKey === scope ||
            node.sourceKey.startsWith(`${scope}.`),
        ),
      );
      const gaps = [
        "Domain review and full Web/native journey verification are outstanding; structural coverage alone does not establish completeness.",
      ];
      if (referenceReviews.some((row) => row.status !== "VERIFIED"))
        gaps.push(
          "Domain reference data is incomplete or awaits source review.",
        );
      if (
        bundle.attributes.some(
          (field) =>
            ids.has(field.id) &&
            field.helpText["en-US"] === field.helpText["fr-FR"] &&
            (field.helpText["fr-FR"]?.length ?? 0) > 30,
        )
      )
        gaps.push(
          "English help text contains copied French prose; localization review required.",
        );
      if (validations.some((rule) => rule.status.startsWith("disabled")))
        gaps.push(
          "Unapproved policy stays disabled; no legal approval is inferred.",
        );
      return {
        id: node.id,
        path,
        labels: node.labels,
        status: node.status,
        markets: node.marketAvailability,
        sellers: node.sellerEligibility,
        listingTypes: types.map((type) => ({
          id: type.id,
          flow: type.publicationFlow,
          intent: type.intent,
          markets: type.marketAvailability,
          sellers: type.sellerEligibility,
        })),
        fields: bindings.map(
          ({ id: _id, categoryId: _categoryId, ...binding }) => binding,
        ),
        dependencies: dependencies.map((rule) => rule.id),
        validations: validations.map((rule) => rule.id),
        references: referenceReviews.map((row) => String(row.id)),
        projections: {
          publication: bundle.projections.publicationFlow.filter((row) =>
            types.some((type) => type.id === row.listingTypeId),
          ),
          cards: bundle.projections.cardFields.filter((row) =>
            types.some((type) => type.id === row.listingTypeId),
          ),
          details: bundle.projections.detailFields.filter((row) =>
            types.some((type) => type.id === row.listingTypeId),
          ),
          filters: bundle.projections.filters.filter((row) =>
            types.some((type) => type.id === row.listingTypeId),
          ),
          search: bundle.projections.search.filter(
            (row) => row.categoryId === node.id,
          ),
          seo: bundle.projections.seo.filter(
            (row) => row.categoryId === node.id,
          ),
        },
        outcome:
          node.id === "electronics.smartphones.phones"
            ? "partial_reference_improvement_review_required"
            : "structural_audit_domain_review_required",
        gaps,
        notApplicable: [
          ...(dependencies.length
            ? []
            : [
                "No conditional field rule is declared; this is an inventory result, not a domain exemption.",
              ]),
        ],
      };
    });
  return {
    scope:
      "Controlled import baseline; use admin export for the live database revision",
    checksum: bundle.metadata.normalizedSha256,
    hierarchyDepth:
      Math.max(...bundle.categories.map((node) => node.level)) + 1,
    counts: {
      nodes: bundle.categories.length,
      roots: bundle.categories.filter((node) => !node.parentId).length,
      leaves: leaves.length,
      listingTypes: bundle.listingTypes.length,
      flows: new Set(bundle.listingTypes.map((type) => type.publicationFlow))
        .size,
      attributes: bundle.attributes.length,
      bindings: bundle.bindings.length,
      options: bundle.options.length,
    },
    nodes: bundle.categories,
    // Dictionaries avoid duplicating definitions and allowed values at every leaf.
    definitions: bundle.attributes,
    groups: bundle.attributeGroups,
    optionSets: bundle.optionSets,
    options: bundle.options,
    parentLinks: bundle.optionParentLinks,
    dependencies: bundle.dependencies,
    validations: bundle.validationRules.map(
      ({ expression: _expression, ...rule }) => rule,
    ),
    references: bundle.referenceData,
    leaves,
  };
}

export function taxonomyCoverageMarkdown(
  report: ReturnType<typeof taxonomyCoverage>,
): string {
  const rows = report.leaves.map((leaf) => {
    const fields = leaf.fields.filter((binding) => binding.publicationVisible);
    const markets = leaf.markets
      .filter((market) => market.marketplaceEnabled)
      .map((market) => market.marketCode)
      .join(", ");
    return `| ${leaf.id} | ${leaf.listingTypes.map((type) => type.flow).join(", ")} | ${markets || "Unavailable"} | ${fields.length} / ${fields.filter((binding) => binding.required).length} | ${leaf.projections.filters.length} / ${leaf.projections.cards.length} / ${leaf.projections.details.length} | ${leaf.outcome} |`;
  });
  return `# Taxonomy leaf coverage\n\nGenerated by \`make taxonomy-compile\`; checked by \`make taxonomy-check\`. This is a controlled-import audit, not runtime configuration. The database owns published content.\n\n${report.counts.nodes} nodes, ${report.counts.roots} roots, ${report.counts.leaves} publishable leaves, ${report.counts.flows} publication flows; supported depth ${report.hierarchyDepth}. No deeper categories or renamed identities were introduced.\n\n[Complete field, option, dependency, market, privacy, projection and gap matrix](generated/taxonomy-coverage.json) uses shared definition dictionaries and an explicit record for every leaf. The glossary is literal: structural coverage is not subject-matter approval or proof of a tested journey. Every leaf still needs domain review; the phone leaf has a limited manufacturer-verified reference improvement.\n\n| Leaf | Flow | Enabled markets | Visible / required fields | Filters / cards / details | Outcome |\n|---|---|---|---:|---:|---|\n${rows.join("\n")}\n`;
}
