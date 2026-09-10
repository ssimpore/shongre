import { describe, expect, it } from "vitest";
import { mergeKeywordSearchParams } from "./search-url";

const criteria = (overrides: Partial<Parameters<typeof mergeKeywordSearchParams>[1]> = {}) => ({
  query: "",
  ...overrides,
});

describe("mergeKeywordSearchParams", () => {
  it("keeps every refinement the visitor already made", () => {
    /* The point of merging rather than navigating: a keyword must not silently
       reset the sort, the condition facet, the price bounds or the view. */
    const { params, leaveCategoryRoute } = mergeKeywordSearchParams(
      new URLSearchParams(
        "sortBy=price_asc&condition=good&priceMin=100&priceMax=900&view=list",
      ),
      criteria({ query: "table" }),
      {},
    );

    expect(leaveCategoryRoute).toBe(false);
    expect(params.get("query")).toBe("table");
    expect(params.get("sortBy")).toBe("price_asc");
    expect(params.get("condition")).toBe("good");
    expect(params.get("priceMin")).toBe("100");
    expect(params.get("priceMax")).toBe("900");
    expect(params.get("view")).toBe("list");
  });

  it("trims the keyword and drops it when it is only whitespace", () => {
    expect(
      mergeKeywordSearchParams(
        new URLSearchParams("query=peugeot"),
        criteria({ query: "   " }),
        {},
      ).params.has("query"),
    ).toBe(false);

    expect(
      mergeKeywordSearchParams(
        new URLSearchParams(),
        criteria({ query: "  vélo gravel  " }),
        {},
      ).params.get("query"),
    ).toBe("vélo gravel");
  });

  it("normalises the `q` alias onto the canonical `query` spelling", () => {
    /* `seo-policy` accepts `query` or `q` when it builds the title, so a `?q=`
       link has to resolve to one spelling rather than leave both on the URL. */
    const { params } = mergeKeywordSearchParams(
      new URLSearchParams("q=peugeot"),
      criteria({ query: "peugeot" }),
      {},
    );

    expect(params.get("query")).toBe("peugeot");
    expect(params.has("q")).toBe(false);
  });

  it("resets pagination so a new keyword lands on the first page", () => {
    const { params } = mergeKeywordSearchParams(
      new URLSearchParams("page=4&cursor=abc123"),
      criteria({ query: "table" }),
      {},
    );

    expect(params.has("page")).toBe(false);
    expect(params.has("cursor")).toBe(false);
  });

  it("clears attribute facets when the category changes", () => {
    const { params } = mergeKeywordSearchParams(
      new URLSearchParams("category=vehicules&attr_carburant=essence&attr_boite=auto"),
      criteria({ query: "table", categorySlug: "maison" }),
      { currentCategorySlug: "vehicules" },
    );

    expect(params.get("category")).toBe("maison");
    expect(params.has("attr_carburant")).toBe(false);
    expect(params.has("attr_boite")).toBe(false);
  });

  it("keeps attribute facets when the category is unchanged", () => {
    const { params } = mergeKeywordSearchParams(
      new URLSearchParams("category=vehicules&attr_carburant=essence"),
      criteria({ query: "208", categorySlug: "vehicules" }),
      { currentCategorySlug: "vehicules" },
    );

    expect(params.get("attr_carburant")).toBe("essence");
  });

  it("writes a radius only alongside a city", () => {
    /* The search bar always carries the location selector's default radius, so
       an unqualified submit used to append `radius=30` and filter nothing. */
    expect(
      mergeKeywordSearchParams(
        new URLSearchParams(),
        criteria({ query: "table", radiusKm: 30 }),
        {},
      ).params.has("radius"),
    ).toBe(false);

    const withCity = mergeKeywordSearchParams(
      new URLSearchParams(),
      criteria({ query: "table", city: "Lyon", radiusKm: 30 }),
      {},
    ).params;
    expect(withCity.get("city")).toBe("Lyon");
    expect(withCity.get("radius")).toBe("30");

    expect(
      mergeKeywordSearchParams(
        new URLSearchParams(),
        criteria({ query: "table", city: "Lyon", radiusKm: 0 }),
        {},
      ).params.has("radius"),
    ).toBe(false);
  });

  it("leaves a category route when the chosen category differs from the path", () => {
    const { params, leaveCategoryRoute } = mergeKeywordSearchParams(
      new URLSearchParams(),
      criteria({ query: "table", categorySlug: "maison" }),
      { categoryRouteSlug: "vehicules", currentCategorySlug: "vehicules" },
    );

    expect(leaveCategoryRoute).toBe(true);
    expect(params.get("category")).toBe("maison");
  });

  it("stays on a category route and lets the path own the category", () => {
    /* `/categorie/vehicules?category=vehicules` says the same thing twice; the
       path is the canonical half. */
    const { params, leaveCategoryRoute } = mergeKeywordSearchParams(
      new URLSearchParams(),
      criteria({ query: "208", categorySlug: "vehicules" }),
      { categoryRouteSlug: "vehicules", currentCategorySlug: "vehicules" },
    );

    expect(leaveCategoryRoute).toBe(false);
    expect(params.has("category")).toBe(false);
    expect(params.get("query")).toBe("208");
  });

  it("drops a cleared sub-category", () => {
    const { params } = mergeKeywordSearchParams(
      new URLSearchParams("category=vehicules&subCategory=vehicles.cars"),
      criteria({ query: "208", categorySlug: "vehicules" }),
      { currentCategorySlug: "vehicules" },
    );

    expect(params.has("subCategory")).toBe(false);
  });
});
