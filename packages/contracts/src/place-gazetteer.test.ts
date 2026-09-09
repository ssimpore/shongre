import { describe, expect, it } from "vitest";
import { normalizePlaceName, resolveApproximatePlace } from "./place-gazetteer";

/**
 * The rule is asymmetric on purpose: being unable to place a town is a normal
 * outcome that costs a map, and placing it wrongly is a defect that shows a
 * reader a confident circle over somewhere the thing is not. Everything below
 * protects the second half.
 */
describe("place gazetteer", () => {
  it("resolves a town to its own centre", () => {
    const biarritz = resolveApproximatePlace({
      city: "Biarritz",
      marketCode: "FR",
    });
    expect(biarritz).toMatchObject({ precision: "city" });
    expect(biarritz!.latitude).toBeCloseTo(43.48, 1);
    expect(biarritz!.longitude).toBeCloseTo(-1.56, 1);
  });

  it("resolves an arrondissement to itself, not to the city centre", () => {
    // Paris is 10 km across. Drawing the 11e over Notre-Dame is the kind of
    // near-miss that is harder to spot than an obvious error and just as wrong.
    const eleventh = resolveApproximatePlace({
      city: "Paris 11e",
      marketCode: "FR",
    })!;
    const centre = resolveApproximatePlace({
      city: "Paris",
      marketCode: "FR",
    })!;
    expect(eleventh.longitude).not.toBeCloseTo(centre.longitude, 2);
    expect(eleventh.longitude).toBeCloseTo(2.3795, 3);

    expect(
      resolveApproximatePlace({ city: "Lyon 2e", marketCode: "FR" })!.latitude,
    ).toBeCloseTo(45.7485, 3);
  });

  it("falls back to the town when the arrondissement is not listed", () => {
    const marseille = resolveApproximatePlace({
      city: "Marseille 15e",
      marketCode: "FR",
    })!;
    expect(marseille.latitude).toBeCloseTo(43.2965, 3);
  });

  it("reads the shapes a form actually collects", () => {
    for (const written of [
      "Écully",
      "ecully",
      "ECULLY",
      "  Écully  ",
      "Écully (69)",
      "Écully Cedex",
    ]) {
      expect(
        resolveApproximatePlace({ city: written, marketCode: "FR" }),
        written,
      ).toMatchObject({ precision: "city" });
    }
    expect(normalizePlaceName("St Étienne")).toBe("saint-etienne");
  });

  it("never answers for a place it does not know", () => {
    for (const city of [
      "Trifouillis-les-Oies",
      "France",
      "",
      "   ",
      "Zzzz",
      "12345",
    ]) {
      expect(
        resolveApproximatePlace({ city, marketCode: "FR" }),
        city,
      ).toBeNull();
    }
    expect(resolveApproximatePlace({ marketCode: "FR" })).toBeNull();
  });

  it("never crosses a border to find an answer", () => {
    // Every market has a Saint-Denis, a Valence or a Bruges somewhere near it;
    // resolving one market's town in another would put a listing in the wrong
    // country with no visible sign that anything went wrong.
    expect(
      resolveApproximatePlace({ city: "Biarritz", marketCode: "BE" }),
    ).toBeNull();
    expect(
      resolveApproximatePlace({ city: "Dakar", marketCode: "FR" }),
    ).toBeNull();
    expect(
      resolveApproximatePlace({ city: "Paris", marketCode: "SN" }),
    ).toBeNull();
    expect(
      resolveApproximatePlace({ city: "Lyon", marketCode: "ZZ" }),
    ).toBeNull();
  });

  it("places every market's entries inside that market", () => {
    /*
     * A transposed or mistyped coordinate in the table is invisible until
     * somebody looks at a map. Each market's entries are checked against a
     * bounding box for the country, which catches a swapped pair, a dropped
     * minus sign and a digit typed twice.
     */
    const bounds: Record<
      string,
      { south: number; north: number; west: number; east: number }
    > = {
      FR: { south: 41.3, north: 51.2, west: -5.2, east: 9.6 },
      BE: { south: 49.4, north: 51.6, west: 2.5, east: 6.5 },
      CH: { south: 45.8, north: 47.9, west: 5.9, east: 10.6 },
      LU: { south: 49.4, north: 50.2, west: 5.7, east: 6.6 },
      SN: { south: 12.2, north: 16.7, west: -17.6, east: -11.3 },
      BF: { south: 9.4, north: 15.1, west: -5.6, east: 2.5 },
    };
    const samples: Record<string, string[]> = {
      FR: ["Paris", "Biarritz", "Ajaccio", "Lille", "Brest", "Menton"],
      BE: ["Bruxelles", "Anvers", "Arlon", "Ostende"],
      CH: ["Zurich", "Genève", "Lugano", "Bâle"],
      LU: ["Luxembourg", "Dudelange"],
      SN: ["Dakar", "Ziguinchor", "Saint-Louis"],
      BF: ["Ouagadougou", "Banfora", "Kaya"],
    };
    for (const [marketCode, cities] of Object.entries(samples)) {
      const box = bounds[marketCode];
      for (const city of cities) {
        const point = resolveApproximatePlace({ city, marketCode });
        expect(point, `${marketCode} ${city}`).not.toBeNull();
        expect(
          point!.latitude,
          `${marketCode} ${city} latitude`,
        ).toBeGreaterThan(box.south);
        expect(point!.latitude, `${marketCode} ${city} latitude`).toBeLessThan(
          box.north,
        );
        expect(
          point!.longitude,
          `${marketCode} ${city} longitude`,
        ).toBeGreaterThan(box.west);
        expect(
          point!.longitude,
          `${marketCode} ${city} longitude`,
        ).toBeLessThan(box.east);
      }
    }
  });
});
