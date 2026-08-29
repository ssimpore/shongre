import { describe, expect, it, vi } from "vitest";
import type { TaxonomyServiceContract } from "../../api/contracts/taxonomy.contract";
import type { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import {
  hasCategoryMenuContent,
  loadCategoryNavigationBranch,
} from "./categoryMegaMenu.model";

const node = (
  id: string,
  slug: string,
  sortOrder: number,
  status: TaxonomyNode["status"] = "active",
): TaxonomyNode => ({
  id,
  code: id.toUpperCase(),
  slug,
  level: id.split(".").length === 1 ? "category" : "subcategory",
  labels: { "fr-FR": slug },
  name: slug,
  sortOrder,
  status,
});

describe("category mega-menu taxonomy projection", () => {
  it("loads a sorted variable-depth branch and removes unavailable nodes", async () => {
    const root = node("root", "racine", 1);
    const first = node("root.first", "premier", 1);
    const second = node("root.second", "second", 2);
    const disabled = node("root.disabled", "indisponible", 0, "disabled");
    const leaf = node("root.second.leaf", "feuille", 1);
    const children = new Map<string, TaxonomyNode[]>([
      [root.id, [second, disabled, first]],
      [first.id, []],
      [second.id, [leaf]],
      [disabled.id, []],
      [leaf.id, []],
    ]);
    const taxonomy = {
      getNodeBySlug: vi.fn().mockResolvedValue(root),
      getChildren: vi.fn((id: string) =>
        Promise.resolve(children.get(id) ?? []),
      ),
    } as unknown as TaxonomyServiceContract;

    const result = await loadCategoryNavigationBranch(
      taxonomy,
      root.slug,
      (candidate) => candidate.status === "active",
    );

    expect(result?.children?.map((child) => child.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(result?.children?.[1]?.children?.[0]?.id).toBe(leaf.id);
    expect(taxonomy.getChildren).not.toHaveBeenCalledWith(disabled.id);
    expect(hasCategoryMenuContent(result)).toBe(true);
  });

  it("fails closed when a root is unavailable or missing", async () => {
    const root = node("root", "racine", 1);
    const taxonomy = {
      getNodeBySlug: vi
        .fn()
        .mockResolvedValueOnce(root)
        .mockResolvedValueOnce(null),
      getChildren: vi.fn(),
    } as unknown as TaxonomyServiceContract;

    await expect(
      loadCategoryNavigationBranch(taxonomy, root.slug, () => false),
    ).resolves.toBeNull();
    await expect(
      loadCategoryNavigationBranch(taxonomy, "absente", () => true),
    ).resolves.toBeNull();
    expect(taxonomy.getChildren).not.toHaveBeenCalled();
    expect(hasCategoryMenuContent(null)).toBe(false);
  });
});
