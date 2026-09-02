import { describe, expect, it, vi } from "vitest";
import type { TaxonomyServiceContract } from "../../api/contracts/taxonomy.contract";
import type { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import {
  hasCategoryMenuContent,
  loadCategoryNavigationBranch,
  loadCategoryNavigationOverview,
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

  it("resolves an admin-configured root by stable id before its display slug", async () => {
    const root = node("electronics", "electronique", 1);
    const taxonomy = {
      getNodeById: vi.fn().mockResolvedValue(root),
      getNodeBySlug: vi.fn().mockResolvedValue(null),
      getChildren: vi.fn().mockResolvedValue([]),
    } as unknown as TaxonomyServiceContract;

    await expect(
      loadCategoryNavigationBranch(
        taxonomy,
        { id: "electronics", slug: "multimedia-electronique" },
        () => true,
      ),
    ).resolves.toMatchObject({ id: "electronics", slug: "electronique" });
    expect(taxonomy.getNodeById).toHaveBeenCalledWith("electronics");
    expect(taxonomy.getNodeBySlug).not.toHaveBeenCalled();
  });

  it("builds the Autres panel from every unpromoted canonical root id", async () => {
    const promoted = node("promoted", "promue", 1);
    const later = node("later", "plus-tard", 3);
    const first = node("first", "premiere", 2);
    const taxonomy = {
      getRootCategories: vi
        .fn()
        .mockResolvedValue([promoted, later, first, first]),
      getNodeBySlug: vi.fn((slug: string) =>
        Promise.resolve(
          [promoted, later, first].find((root) => root.slug === slug) ?? null,
        ),
      ),
      getChildren: vi.fn().mockResolvedValue([]),
    } as unknown as TaxonomyServiceContract;

    const result = await loadCategoryNavigationOverview(
      taxonomy,
      new Set([promoted.id]),
      () => true,
    );

    expect(result.map((root) => root.id)).toEqual([first.id, later.id]);
    expect(taxonomy.getNodeBySlug).not.toHaveBeenCalledWith(promoted.slug);
    expect(taxonomy.getNodeBySlug).toHaveBeenCalledTimes(2);
    expect(hasCategoryMenuContent(first)).toBe(true);
  });
});
