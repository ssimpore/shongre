import { describe, expect, it } from "vitest";
import {
  GEO_LIMITS,
  LOCATION_PRECISIONS,
  boundingBoxAround,
  boundingBoxContains,
  boundingBoxIsWithinLimits,
  distanceKmBetween,
  geoSearchQuerySchema,
  isValidCoordinate,
  precisionIsAtLeastAsCoarse,
  precisionPublishesPoint,
  publicLocationSchema,
} from "./geospatial";

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const LYON = { latitude: 45.764, longitude: 4.8357 };

describe("coordinate validation", () => {
  it("accepts a real place", () => {
    expect(isValidCoordinate(PARIS)).toBe(true);
  });

  it("rejects Null Island, which is what a defaulted zero looks like", () => {
    expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(false);
    // A genuine zero on one axis is still a place: the Greenwich meridian.
    expect(isValidCoordinate({ latitude: 51.4779, longitude: 0 })).toBe(true);
  });

  it("rejects out-of-range, non-finite and absent values", () => {
    expect(isValidCoordinate({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinate({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isValidCoordinate({ latitude: Number.NaN, longitude: 2 })).toBe(
      false,
    );
    expect(isValidCoordinate(null)).toBe(false);
    expect(isValidCoordinate(undefined)).toBe(false);
    expect(isValidCoordinate({ latitude: 48.8 })).toBe(false);
  });
});

describe("distance", () => {
  it("measures Paris to Lyon at its known great-circle distance", () => {
    // ~392 km; a formula error shows up as tens of kilometres, not decimals.
    expect(distanceKmBetween(PARIS, LYON)).toBeGreaterThan(388);
    expect(distanceKmBetween(PARIS, LYON)).toBeLessThan(396);
  });

  it("is zero for a point against itself and symmetric between two", () => {
    expect(distanceKmBetween(PARIS, PARIS)).toBeCloseTo(0, 6);
    expect(distanceKmBetween(PARIS, LYON)).toBeCloseTo(
      distanceKmBetween(LYON, PARIS),
      9,
    );
  });
});

describe("bounding boxes", () => {
  it("covers every point inside the radius it was built from", () => {
    const box = boundingBoxAround(PARIS, 30);
    expect(boundingBoxContains(box, PARIS)).toBe(true);
    // Versailles, ~17 km south-west.
    expect(
      boundingBoxContains(box, { latitude: 48.8014, longitude: 2.1301 }),
    ).toBe(true);
    expect(boundingBoxContains(box, LYON)).toBe(false);
  });

  it("widens in longitude as latitude rises, because meridians converge", () => {
    const equator = boundingBoxAround({ latitude: 0, longitude: 0 }, 50);
    const arctic = boundingBoxAround({ latitude: 70, longitude: 0 }, 50);
    expect(arctic.east - arctic.west).toBeGreaterThan(
      equator.east - equator.west,
    );
  });

  it("never leaves the coordinate range, even at a pole", () => {
    const box = boundingBoxAround({ latitude: 89.9, longitude: 179.9 }, 200);
    expect(box.north).toBeLessThanOrEqual(GEO_LIMITS.latitude.max);
    expect(box.south).toBeGreaterThanOrEqual(GEO_LIMITS.latitude.min);
    expect(box.east).toBeLessThanOrEqual(GEO_LIMITS.longitude.max);
    expect(box.west).toBeGreaterThanOrEqual(GEO_LIMITS.longitude.min);
  });

  it("reads a box that crosses the antimeridian as two ranges", () => {
    const box = { north: 10, south: -10, east: -170, west: 170 };
    expect(boundingBoxContains(box, { latitude: 0, longitude: 179 })).toBe(
      true,
    );
    expect(boundingBoxContains(box, { latitude: 0, longitude: -179 })).toBe(
      true,
    );
    expect(boundingBoxContains(box, { latitude: 0, longitude: 0 })).toBe(false);
  });

  it("refuses a viewport too large to answer", () => {
    expect(
      boundingBoxIsWithinLimits({ north: 51, south: 42, east: 8, west: -5 }),
    ).toBe(true);
    expect(
      boundingBoxIsWithinLimits({
        north: 80,
        south: -80,
        east: 170,
        west: -170,
      }),
    ).toBe(false);
  });
});

describe("precision policy", () => {
  it("orders precisions from most to least revealing", () => {
    expect(LOCATION_PRECISIONS[0]).toBe("exact");
    expect(LOCATION_PRECISIONS[LOCATION_PRECISIONS.length - 1]).toBe("hidden");
  });

  it("publishes a point for every precision except hidden", () => {
    for (const precision of LOCATION_PRECISIONS) {
      expect(precisionPublishesPoint(precision)).toBe(precision !== "hidden");
    }
  });

  it("treats a coarser precision as satisfying a policy floor", () => {
    expect(precisionIsAtLeastAsCoarse("city", "approximate")).toBe(true);
    expect(precisionIsAtLeastAsCoarse("approximate", "approximate")).toBe(true);
    expect(precisionIsAtLeastAsCoarse("exact", "approximate")).toBe(false);
  });
});

describe("search query", () => {
  it("refuses a radius with no centre", () => {
    expect(geoSearchQuerySchema.safeParse({ radiusKm: 10 }).success).toBe(
      false,
    );
    expect(
      geoSearchQuerySchema.safeParse({ ...PARIS, radiusKm: 10 }).success,
    ).toBe(true);
  });

  it("caps the radius at the documented maximum", () => {
    expect(
      geoSearchQuerySchema.safeParse({
        ...PARIS,
        radiusKm: GEO_LIMITS.searchRadiusKm.max + 1,
      }).success,
    ).toBe(false);
  });
});

describe("public location", () => {
  it("allows a precision with no coordinate, for a hidden location", () => {
    expect(publicLocationSchema.parse({ precision: "hidden" })).toEqual({
      precision: "hidden",
    });
  });

  it("rejects a coordinate outside the valid range", () => {
    expect(
      publicLocationSchema.safeParse({
        precision: "city",
        coordinate: { latitude: 200, longitude: 0 },
      }).success,
    ).toBe(false);
  });
});
