import { describe, expect, it } from "vitest";
import {
  foldDiacritics,
  normalizeSearchText,
  searchVocabularyTerms,
  trigramSimilarity,
} from "./search-normalization";

describe("foldDiacritics", () => {
  it("removes combining marks and leaves everything else alone", () => {
    expect(foldDiacritics("Café Sézane")).toBe("Cafe Sezane");
    expect(foldDiacritics("VÉLO")).toBe("VELO");
    expect(foldDiacritics("Ouagadougou")).toBe("Ouagadougou");
  });
});

describe("normalizeSearchText", () => {
  it("makes an unaccented query comparable to accented content", () => {
    expect(normalizeSearchText("café")).toBe(normalizeSearchText("cafe"));
    expect(normalizeSearchText("Vélo")).toBe(normalizeSearchText("velo"));
    expect(normalizeSearchText("Sézane")).toBe(normalizeSearchText("sezane"));
  });

  it("collapses punctuation so a comma cannot break a match", () => {
    expect(normalizeSearchText("Sézane, Paris")).toBe("sezane paris");
    expect(normalizeSearchText("  A2--B3  ")).toBe("a2 b3");
  });

  it("returns an empty string for input with nothing comparable", () => {
    expect(normalizeSearchText("   ")).toBe("");
    expect(normalizeSearchText("!!!")).toBe("");
  });
});

describe("searchVocabularyTerms", () => {
  it("keys words by their unaccented form and keeps the catalogue spelling", () => {
    expect(
      searchVocabularyTerms("Vélo urbain électrique Cowboy, 1ère main"),
    ).toEqual([
      { term: "velo", label: "vélo" },
      { term: "urbain", label: "urbain" },
      { term: "electrique", label: "électrique" },
      { term: "cowboy", label: "cowboy" },
      { term: "1ere", label: "1ère" },
      { term: "main", label: "main" },
    ]);
  });

  it("drops stopwords, pure numbers and one-letter fragments", () => {
    expect(
      searchVocabularyTerms("iPhone 15 Pro de 128 Go avec la boîte"),
    ).toEqual([
      { term: "iphone", label: "iphone" },
      { term: "pro", label: "pro" },
      { term: "go", label: "go" },
      { term: "boite", label: "boîte" },
    ]);
  });
});

describe("trigramSimilarity", () => {
  it("matches pg_trgm for a one-letter typo", () => {
    // pg_trgm: similarity('iphone', 'ipone') = 0.444444
    expect(trigramSimilarity("iphone", "ipone")).toBeCloseTo(4 / 9, 5);
    // pg_trgm: similarity('electrique', 'electrik') = 0.538462
    expect(trigramSimilarity("electrique", "electrik")).toBeCloseTo(7 / 13, 5);
  });

  it("is symmetric, accent-insensitive and bounded", () => {
    expect(trigramSimilarity("vélo", "velo")).toBe(1);
    expect(trigramSimilarity("canape", "voiture")).toBe(0);
    expect(trigramSimilarity("", "velo")).toBe(0);
    expect(trigramSimilarity("electrique", "electrik")).toBe(
      trigramSimilarity("electrik", "electrique"),
    );
  });
});
