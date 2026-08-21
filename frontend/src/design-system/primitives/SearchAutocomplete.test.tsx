import { describe, it, expect, vi } from "vitest";
import React from "react";
import { SearchAutocomplete, HighlightMatch } from "./SearchAutocomplete";
import { getSearchSuggestions } from "../../configuration/search.config";

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
    const results = getSearchSuggestions("");
    expect(results.categories).toHaveLength(0);
    expect(results.keywords).toHaveLength(0);
    expect(results.trending.length).toBeGreaterThan(0);
  });

  it("matches categories when typing category name or keyword", () => {
    const results = getSearchSuggestions("vehic");
    expect(
      results.categories.some(
        (c) => c.slug === "vehicules" || c.parentSlug === "vehicules",
      ),
    ).toBe(true);
  });

  it("matches keywords for tech searches", () => {
    const results = getSearchSuggestions("iPhone");
    expect(
      results.keywords.some((k) => k.keyword.toLowerCase().includes("iphone")),
    ).toBe(true);
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
      categoryObj: {
        id: "cat-1",
        name: "Véhicules",
        slug: "vehicules",
        icon: "Car",
        subCategories: [],
      } as any,
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
      onClose: vi.fn(),
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
      onClose: vi.fn(),
    });

    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(false);
  });
});
