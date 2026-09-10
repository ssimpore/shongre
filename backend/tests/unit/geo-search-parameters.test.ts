import { describe, expect, it } from "vitest";
import { __testing } from "../../src/modules/listings/api/listings.routes.js";

/**
 * The HTTP boundary for geographic search.
 *
 * These exist because the first version of this validation rejected a radius
 * with no centre, which is the shape every results page sends from the moment
 * it loads — turning the default search into a 400 on every surface. The rule
 * a caller can actually satisfy is the one worth encoding.
 */

/*
 * Imported at module scope rather than inside the first test. The route module
 * pulls in the listings service graph, which takes long enough on a loaded
 * machine to exceed a test's own timeout — so the cost belongs in collection,
 * where it is not being measured as a test.
 */
function parseQuery(query: string) {
  return __testing.parsePublicListingSearchQuery(
    new URLSearchParams(query),
    "FR",
  );
}

describe("geographic search parameters", () => {
  it("accepts a radius with no centre and drops it", () => {
    const parsed = parseQuery("radiusKm=30&sortBy=date_desc");
    expect(parsed.radiusKm).toBeUndefined();
    expect(parsed.center).toBeUndefined();
  });

  it("keeps a radius once a centre travels with it", () => {
    const parsed = parseQuery("latitude=48.8566&longitude=2.3522&radiusKm=30");
    expect(parsed.center).toEqual({ latitude: 48.8566, longitude: 2.3522 });
    expect(parsed.radiusKm).toBe(30);
  });

  it("refuses half a coordinate, which is an input error rather than a default", () => {
    expect(() => parseQuery("latitude=48.8566")).toThrow();
    expect(() => parseQuery("longitude=2.3522")).toThrow();
  });

  it("assembles four edges into one viewport", () => {
    const parsed = parseQuery("north=49&south=48&east=3&west=1");
    expect(parsed.boundingBox).toEqual({
      north: 49,
      south: 48,
      east: 3,
      west: 1,
    });
  });

  it("refuses a partial viewport", () => {
    expect(() => parseQuery("north=49&south=48&east=3")).toThrow();
  });

  it("refuses an inverted viewport", () => {
    expect(() => parseQuery("north=48&south=49&east=3&west=1")).toThrow();
  });

  it("refuses a viewport too large to answer", () => {
    // A box the size of a continent is an unbounded query with a map on top.
    expect(() => parseQuery("north=60&south=20&east=40&west=-20")).toThrow();
  });

  it("refuses a radius past the documented platform limit", () => {
    expect(() =>
      parseQuery("latitude=48.8566&longitude=2.3522&radiusKm=5000"),
    ).toThrow();
  });

  it("refuses a coordinate outside the coordinate system", () => {
    expect(() =>
      parseQuery("latitude=200&longitude=2.3522&radiusKm=10"),
    ).toThrow();
  });
});
