import { describe, expect, it } from "vitest";
import { foldDiacritics, normalizeSearchText } from "./search-normalization";

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
