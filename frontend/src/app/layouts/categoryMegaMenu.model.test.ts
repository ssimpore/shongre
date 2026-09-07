import { describe, expect, it, vi } from "vitest";
import type {
  MarketContext,
  TaxonomyV4Node,
  TaxonomyV4TreeResponse,
} from "@shongre/contracts";
import type { TaxonomyServiceContract } from "../../api/contracts/taxonomy.contract";
import {
  buildCategoryNavigationTree,
  filterCategoryNavigationOverview,
  findCategoryNavigationBranch,
  hasCategoryMenuContent,
  loadCategoryNavigationTree,
} from "./categoryMegaMenu.model";

const marketAvailability: TaxonomyV4Node["marketAvailability"] = [
  {
    marketCode: "FR",
    status: "active",
    marketplaceEnabled: true,
    indexable: true,
  },
  {
    marketCode: "BE",
    status: "active",
    marketplaceEnabled: true,
    indexable: true,
  },
  {
    marketCode: "CH",
    status: "active",
    marketplaceEnabled: true,
    indexable: true,
  },
  {
    marketCode: "SN",
    status: "unavailable",
    marketplaceEnabled: false,
    indexable: false,
  },
  {
    marketCode: "BF",
    status: "unavailable",
    marketplaceEnabled: false,
    indexable: false,
  },
];

const node = (
  id: string,
  slug: string,
  sortOrder: number,
  parentId?: string,
  status: TaxonomyV4Node["status"] = "active",
): TaxonomyV4Node => ({
  id,
  sourceKey: id,
  ...(parentId ? { parentId } : {}),
  level: parentId ? (id.split(".").length === 2 ? 1 : 2) : 0,
  slug,
  labels: { "fr-FR": slug, "en-US": slug },
  shortLabels: { "fr-FR": slug },
  iconName: "package",
  sortOrder,
  status,
  publishable: Boolean(parentId),
  sellerEligibility: {
    individualAllowed: true,
    professionalAllowed: true,
  },
  marketAvailability,
  seo: { indexable: true },
});

describe("category mega-menu taxonomy projection", () => {
  it("builds a sorted variable-depth tree and removes unavailable branches", () => {
    const root = node("root", "racine", 1);
    const first = node("root.first", "premier", 1, root.id);
    const second = node("root.second", "second", 2, root.id);
    const disabled = node(
      "root.disabled",
      "indisponible",
      0,
      root.id,
      "disabled",
    );
    const leaf = node("root.second.leaf", "feuille", 1, second.id);

    const result = buildCategoryNavigationTree(
      [second, disabled, leaf, first, root],
      (candidate) => candidate.status === "active",
    );

    expect(result[0]?.children?.map((child) => child.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(result[0]?.children?.[1]?.children?.[0]?.id).toBe(leaf.id);
    expect(hasCategoryMenuContent(result[0])).toBe(true);
  });

  it("loads the complete market tree through one canonical API request", async () => {
    const root = node("root", "racine", 1);
    const getV4Tree = vi.fn().mockResolvedValue({
      items: [root],
    } as TaxonomyV4TreeResponse);
    const taxonomy = { getV4Tree } as unknown as TaxonomyServiceContract;
    const marketContext = {
      kind: "market",
      countryCode: "FR",
    } as MarketContext;

    await expect(
      loadCategoryNavigationTree(taxonomy, marketContext, "fr-FR", () => true),
    ).resolves.toHaveLength(1);
    expect(getV4Tree).toHaveBeenCalledTimes(1);
    expect(getV4Tree).toHaveBeenCalledWith({
      marketContext,
      locale: "fr-FR",
      taxonomyVersion: "4.0.0",
    });
  });

  it("resolves an admin-configured root by stable id before display slug", () => {
    const root = buildCategoryNavigationTree(
      [node("electronics", "electronique", 1)],
      () => true,
    );

    expect(
      findCategoryNavigationBranch(root, {
        id: "electronics",
        slug: "multimedia-electronique",
      }),
    ).toMatchObject({ id: "electronics", slug: "electronique" });
    expect(findCategoryNavigationBranch(root, "absente")).toBeNull();
  });

  it("builds the Autres panel from every unpromoted canonical root id", () => {
    const promoted = node("promoted", "promue", 1);
    const later = node("later", "plus-tard", 3);
    const first = node("first", "premiere", 2);
    const roots = buildCategoryNavigationTree(
      [promoted, later, first],
      () => true,
    );

    const result = filterCategoryNavigationOverview(
      roots,
      new Set([promoted.id]),
    );

    expect(result.map((root) => root.id)).toEqual([first.id, later.id]);
    expect(hasCategoryMenuContent(result[0])).toBe(true);
  });
});
