import { describe, expect, it } from "vitest";
import {
  CANONICAL_TAXONOMY_IDENTITIES,
  CANONICAL_TAXONOMY_IDENTITY_BY_ID,
  CANONICAL_TAXONOMY_ALIASES,
} from "./taxonomy-catalog";

describe("canonical taxonomy identity catalog", () => {
  it("keeps stable ids, codes and slugs globally unique", () => {
    expect(CANONICAL_TAXONOMY_IDENTITIES).toHaveLength(61);
    for (const key of ["id", "code", "slug"] as const) {
      const values = CANONICAL_TAXONOMY_IDENTITIES.map((node) => node[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it("has no orphan or circular parent relationships", () => {
    CANONICAL_TAXONOMY_IDENTITIES.forEach((node) => {
      if (node.parentId) {
        expect(
          CANONICAL_TAXONOMY_IDENTITY_BY_ID.has(node.parentId),
          node.id,
        ).toBe(true);
      }
      const visited = new Set([node.id]);
      let parentId = node.parentId;
      while (parentId) {
        expect(visited.has(parentId), node.id).toBe(false);
        visited.add(parentId);
        parentId = CANONICAL_TAXONOMY_IDENTITY_BY_ID.get(parentId)?.parentId;
      }
    });
  });

  it("keeps both canonical locales and a publication intent on every node", () => {
    CANONICAL_TAXONOMY_IDENTITIES.forEach((node) => {
      expect(node.labels["fr-FR"], node.id).not.toBe("");
      expect(node.labels["en-US"], node.id).not.toBe("");
      expect(node.supportedIntents.length, node.id).toBeGreaterThan(0);
    });
  });

  it("resolves every legacy alias without treating collections as categories", () => {
    Object.entries(CANONICAL_TAXONOMY_ALIASES).forEach(([alias, target]) => {
      expect(alias).toBe(alias.toLocaleLowerCase("fr-FR"));
      expect(CANONICAL_TAXONOMY_IDENTITY_BY_ID.has(target), alias).toBe(true);
    });
    expect(CANONICAL_TAXONOMY_ALIASES["bons-plans"]).toBeUndefined();
  });
});
