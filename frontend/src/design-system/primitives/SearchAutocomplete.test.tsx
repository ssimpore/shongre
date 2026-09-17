import { describe, it, expect, vi } from "vitest";
import React from "react";
import { SearchAutocomplete, HighlightMatch } from "./SearchAutocomplete";
import { getSearchSuggestions } from "../../configuration/search.config";
import { taxonomyV1TestCategories } from "../../testing/taxonomy-v1.test-support";

describe("HighlightMatch", () => {
  it("instantiates correctly with text", () => {
    const el = React.createElement(HighlightMatch, {
      text: "Vélo gravel",
      highlight: "",
    });
    expect(el).toBeDefined();
    expect(el.props.text).toBe("Vélo gravel");
  });

  it("instantiates correctly with highlight query", () => {
    const el = React.createElement(HighlightMatch, {
      text: "Vélo gravel",
      highlight: "gravel",
    });
    expect(el).toBeDefined();
    expect(el.props.highlight).toBe("gravel");
  });
});

describe("getSearchSuggestions", () => {
  it("returns empty matched categories and keywords when query is empty", () => {
    const results = getSearchSuggestions(
      "",
      undefined,
      [],
      5,
      [],
      ["Vélo gravel"],
    );
    expect(results.categories).toHaveLength(0);
    expect(results.keywords).toHaveLength(0);
    expect(results.trending.length).toBeGreaterThan(0);
  });

  it("matches categories when typing category name or keyword", () => {
    const results = getSearchSuggestions(
      "vehic",
      undefined,
      taxonomyV1TestCategories,
    );
    expect(
      results.categories.some(
        (c) => c.slug === "vehicules" || c.parentSlug === "vehicules",
      ),
    ).toBe(true);
  });

  it("passes the API's completions through without re-filtering them", () => {
    // "velo" was corrected to "vélo" by the API; a substring test would drop it.
    const results = getSearchSuggestions("velo", undefined, [], 5, [
      { kind: "term", query: "vélo", label: "vélo", listingCount: 3 },
      { kind: "term", query: "velours", label: "velours", listingCount: 1 },
    ]);
    expect(results.keywords.map((k) => k.keyword)).toEqual(["vélo", "velours"]);
  });

  it("lists API categories before local matches and de-duplicates by slug", () => {
    const results = getSearchSuggestions(
      "vehic",
      undefined,
      taxonomyV1TestCategories,
      5,
      [
        {
          kind: "category",
          categoryId: "vehicules",
          categorySlug: "vehicules",
          label: "Véhicules",
          iconName: "Car",
        },
        {
          kind: "category",
          categoryId: "vehicules.utilitaires",
          categorySlug: "utilitaires",
          label: "Utilitaires",
          parentLabel: "Véhicules",
          parentSlug: "vehicules",
        },
      ],
    );
    expect(results.categories[0]).toMatchObject({
      slug: "vehicules",
      iconName: "Car",
      isSubCategory: false,
    });
    expect(results.categories[1]).toMatchObject({
      slug: "utilitaires",
      parentSlug: "vehicules",
      isSubCategory: true,
    });
    expect(
      results.categories.filter((c) => c.slug === "vehicules"),
    ).toHaveLength(1);
  });
});

describe("SearchAutocomplete component", () => {
  const dummyCategories = [
    {
      id: "cat-1",
      name: "Véhicules",
      slug: "vehicules",
      compactLabel: "Véhicules",
      isSubCategory: false,
      iconName: "Car",
    },
  ];

  const dummyKeywords = [
    {
      keyword: "Vélo gravel",
      categorySlug: "loisirs",
      subCategorySlug: "loisirs.velos",
      isTrending: true,
    },
  ];

  const dummyTrending = [
    {
      keyword: "PlayStation 5",
      categorySlug: "multimedia",
      isTrending: true,
    },
  ];

  it("instantiates with props without errors", () => {
    const element = React.createElement(SearchAutocomplete, {
      isOpen: true,
      query: "velo",
      categories: dummyCategories,
      keywords: dummyKeywords,
      trending: dummyTrending,
      recentSearches: ["iPhone 15"],
      selectedIndex: 0,
      onSelect: vi.fn(),
    });

    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.query).toBe("velo");
  });

  it("instantiates in closed state", () => {
    const element = React.createElement(SearchAutocomplete, {
      isOpen: false,
      query: "",
      categories: [],
      keywords: [],
      trending: dummyTrending,
      recentSearches: [],
      selectedIndex: -1,
      onSelect: vi.fn(),
    });

    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(false);
  });
});
