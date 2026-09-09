import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TAXONOMY_V1_PRIVATE_BUNDLE as bundle } from "../../taxonomy/generated/taxonomy-v1.private.js";
import applicability from "../../taxonomy/v1/leaf-applicability.json";

const coverage = JSON.parse(
  readFileSync(
    new URL(
      "../../../docs/architecture/generated/taxonomy-coverage.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  leaves: Array<{
    id: string;
    fields: Array<{ attributeId: string }>;
    notApplicable: Array<
      string | { attributeId: string; reason: Record<string, string> }
    >;
    projections: {
      filters: Array<{ attributeId: string }>;
      cards: Array<{ field: { kind: string; key: string } }>;
      details: Array<{ field: { kind: string; key: string } }>;
      publication: Array<{
        requiredFields: Array<{ kind: string; key: string }>;
      }>;
      search: Array<{
        searchableFields: string[];
        filterableAttributeIds: string[];
        sortableAttributeIds: string[];
      }>;
    };
  }>;
};

const boundLeaves = (attributeId: string) =>
  new Set(
    bundle.bindings
      .filter(
        (binding) =>
          binding.attributeId === attributeId &&
          binding.scope !== "FLOW_TEMPLATE",
      )
      .map((binding) => binding.categoryId),
  );

describe("reviewed leaf applicability", () => {
  it("publishes each reviewed attribute on exactly its applicable leaves", () => {
    applicability.decisions.forEach((decision) => {
      const bound = boundLeaves(decision.attributeId);
      const withinVertical = [...bound].filter(
        (categoryId) => categoryId.split(".")[0] === decision.vertical,
      );
      expect([...withinVertical].sort(), decision.attributeId).toEqual(
        [...decision.appliesTo].sort(),
      );
      decision.appliesTo.forEach((categoryId) => {
        const category = bundle.categories.find(
          (node) => node.id === categoryId,
        );
        expect(category?.publishable, categoryId).toBe(true);
        expect(category?.status, categoryId).toBe("active");
      });
    });
  });

  it("records a bilingual justification for every removed field", () => {
    const recorded = new Set(
      coverage.leaves.flatMap((leaf) =>
        leaf.notApplicable
          .filter((entry) => typeof entry !== "string")
          .map((entry) => `${leaf.id}|${entry.attributeId}`),
      ),
    );
    let removals = 0;
    applicability.decisions.forEach((decision) => {
      expect(decision.reason["fr-FR"], decision.attributeId).toBeTruthy();
      expect(decision.reason["en-US"], decision.attributeId).toBeTruthy();
      // A justification copied across locales is not a translation.
      expect(decision.reason["en-US"], decision.attributeId).not.toBe(
        decision.reason["fr-FR"],
      );
      bundle.categories
        .filter(
          (node) =>
            node.publishable && node.id.split(".")[0] === decision.vertical,
        )
        .forEach((node) => {
          if (decision.appliesTo.includes(node.id)) return;
          const wasConsidered = coverage.leaves.some(
            (leaf) =>
              leaf.id === node.id &&
              leaf.notApplicable.some(
                (entry) =>
                  typeof entry !== "string" &&
                  entry.attributeId === decision.attributeId,
              ),
          );
          if (!wasConsidered) return;
          removals += 1;
          expect(recorded.has(`${node.id}|${decision.attributeId}`)).toBe(true);
        });
    });
    expect(removals).toBeGreaterThan(0);
  });

  it("never leaves a removed field bound, projected or filterable", () => {
    coverage.leaves.forEach((leaf) => {
      const notApplicable = new Set(
        leaf.notApplicable
          .filter((entry) => typeof entry !== "string")
          .map((entry) => entry.attributeId),
      );
      if (notApplicable.size === 0) return;
      leaf.fields.forEach((field) => {
        expect(notApplicable.has(field.attributeId), leaf.id).toBe(false);
      });
      leaf.projections.filters.forEach((row) => {
        expect(notApplicable.has(row.attributeId), leaf.id).toBe(false);
      });
      [...leaf.projections.cards, ...leaf.projections.details].forEach(
        (row) => {
          if (row.field.kind !== "attribute") return;
          expect(notApplicable.has(row.field.key), leaf.id).toBe(false);
        },
      );
      leaf.projections.search.forEach((row) => {
        [
          ...row.searchableFields,
          ...row.filterableAttributeIds,
          ...row.sortableAttributeIds,
        ].forEach((attributeId) => {
          expect(notApplicable.has(attributeId), leaf.id).toBe(false);
        });
      });
    });
  });

  it("keeps publication, filtering, cards, details and search on the same field identities", () => {
    coverage.leaves.forEach((leaf) => {
      const bound = new Set(leaf.fields.map((field) => field.attributeId));
      const check = (attributeId: string, surface: string) => {
        expect(bound.has(attributeId), `${leaf.id} ${surface}`).toBe(true);
      };
      leaf.projections.filters.forEach((row) =>
        check(row.attributeId, "filter"),
      );
      [...leaf.projections.cards, ...leaf.projections.details].forEach(
        (row) => {
          if (row.field.kind === "attribute")
            check(row.field.key, "projection");
        },
      );
      leaf.projections.publication.forEach((row) =>
        row.requiredFields.forEach((field) => {
          if (field.kind === "attribute") check(field.key, "publication");
        }),
      );
      leaf.projections.search.forEach((row) =>
        [
          ...row.searchableFields,
          ...row.filterableAttributeIds,
          ...row.sortableAttributeIds,
        ].forEach((attributeId) => check(attributeId, "search")),
      );
    });
  });
});
