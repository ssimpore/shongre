import { describe, it, expect } from "vitest";
import { normalizeSearchText, searchTextIncludes } from "./search-text";

describe("normalizeSearchText", () => {
  it("folds the accents a French keyboard makes optional", () => {
    expect(normalizeSearchText("Vélo")).toBe("velo");
    expect(normalizeSearchText("Machine à Café")).toBe("machine a cafe");
    expect(normalizeSearchText("Sézane")).toBe("sezane");
    expect(normalizeSearchText("Bébé & Puériculture")).toBe(
      "bebe & puericulture",
    );
  });

  it("folds ligatures that NFD leaves alone", () => {
    expect(normalizeSearchText("Cœur")).toBe("coeur");
    expect(normalizeSearchText("Ex æquo")).toBe("ex aequo");
    expect(normalizeSearchText("Straße")).toBe("strasse");
  });

  it("normalises typographic apostrophes and runs of whitespace", () => {
    expect(normalizeSearchText("L’Atelier")).toBe("l'atelier");
    expect(normalizeSearchText("  table   ronde  ")).toBe("table ronde");
  });

  it("is total over empty input", () => {
    expect(normalizeSearchText("")).toBe("");
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText(undefined)).toBe("");
  });
});

describe("searchTextIncludes", () => {
  /* The regression this exists for: the results page matched with a bare
     `toLowerCase()`, so `velo` returned nothing while the autocomplete happily
     suggested "Vélos & Trottinettes" — it only matched because it fell through
     to the slug, which is already ASCII. */
  it("matches an unaccented query against accented content, and back", () => {
    const title = "Vélo Gravel Canyon Grizl";
    expect(searchTextIncludes(title, normalizeSearchText("velo"))).toBe(true);
    expect(searchTextIncludes(title, normalizeSearchText("vélo"))).toBe(true);

    const coffee = "Machine à Café Espresso avec Broyeur";
    expect(searchTextIncludes(coffee, normalizeSearchText("cafe"))).toBe(true);
    expect(searchTextIncludes(coffee, normalizeSearchText("CAFÉ"))).toBe(true);
  });

  it("still refuses text that genuinely does not match", () => {
    expect(
      searchTextIncludes("Vélo Gravel", normalizeSearchText("piano")),
    ).toBe(false);
  });

  it("treats an empty needle as matching everything", () => {
    expect(searchTextIncludes("anything", "")).toBe(true);
  });

  it("does not throw on absent content", () => {
    expect(searchTextIncludes(null, normalizeSearchText("velo"))).toBe(false);
  });
});
