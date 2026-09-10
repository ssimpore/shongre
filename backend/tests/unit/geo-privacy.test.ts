import { describe, expect, it } from "vitest";
import { distanceKmBetween } from "@shongre/contracts/geospatial";
import {
  displaceCoordinate,
  projectPublicLocation,
} from "../../src/modules/geo/geo.privacy.js";

const HOME = { latitude: 48.8566, longitude: 2.3522 };
const SECRET = "test-displacement-secret";
const RADIUS = 1_000;

describe("deterministic displacement", () => {
  it("returns the same point for the same subject, every time", () => {
    const first = displaceCoordinate({
      coordinate: HOME,
      subjectId: "listing-1",
      radiusMeters: RADIUS,
      secret: SECRET,
    });
    const second = displaceCoordinate({
      coordinate: HOME,
      subjectId: "listing-1",
      radiusMeters: RADIUS,
      secret: SECRET,
    });
    expect(second).toEqual(first);
  });

  it("moves the point, so the real one is not published", () => {
    const displaced = displaceCoordinate({
      coordinate: HOME,
      subjectId: "listing-1",
      radiusMeters: RADIUS,
      secret: SECRET,
    });
    expect(displaced).not.toEqual(HOME);
    expect(distanceKmBetween(HOME, displaced)).toBeGreaterThan(0);
  });

  it("stays inside the configured radius", () => {
    for (let index = 0; index < 400; index += 1) {
      const displaced = displaceCoordinate({
        coordinate: HOME,
        subjectId: `listing-${index}`,
        radiusMeters: RADIUS,
        secret: SECRET,
      });
      // Kilometres, with a metre of slack for floating point.
      expect(distanceKmBetween(HOME, displaced)).toBeLessThanOrEqual(
        RADIUS / 1_000 + 0.001,
      );
    }
  });

  it("gives two listings at the same address different points", () => {
    const first = displaceCoordinate({
      coordinate: HOME,
      subjectId: "listing-a",
      radiusMeters: RADIUS,
      secret: SECRET,
    });
    const second = displaceCoordinate({
      coordinate: HOME,
      subjectId: "listing-b",
      radiusMeters: RADIUS,
      secret: SECRET,
    });
    expect(second).not.toEqual(first);
  });

  it("does not average back to the true point", () => {
    /*
     * The failure this guards against is a *random* offset re-rolled per
     * request: sample it enough times and the mean is the seller's doorstep.
     * With a deterministic offset the samples for one subject are one point,
     * so the mean of repeated reads stays that displaced point.
     */
    const samples = Array.from({ length: 200 }, () =>
      displaceCoordinate({
        coordinate: HOME,
        subjectId: "listing-stable",
        radiusMeters: RADIUS,
        secret: SECRET,
      }),
    );
    const mean = {
      latitude:
        samples.reduce((sum, point) => sum + point.latitude, 0) /
        samples.length,
      longitude:
        samples.reduce((sum, point) => sum + point.longitude, 0) /
        samples.length,
    };
    expect(distanceKmBetween(HOME, mean)).toBeGreaterThan(0.05);
  });

  it("changes with the secret, so a rotation actually moves points", () => {
    const other = displaceCoordinate({
      coordinate: HOME,
      subjectId: "listing-1",
      radiusMeters: RADIUS,
      secret: "a-different-secret",
    });
    expect(other).not.toEqual(
      displaceCoordinate({
        coordinate: HOME,
        subjectId: "listing-1",
        radiusMeters: RADIUS,
        secret: SECRET,
      }),
    );
  });

  it("wraps rather than clamps across the antimeridian", () => {
    const displaced = displaceCoordinate({
      coordinate: { latitude: -16.5, longitude: 179.9999 },
      subjectId: "fiji",
      radiusMeters: 5_000,
      secret: SECRET,
    });
    expect(displaced.longitude).toBeGreaterThanOrEqual(-180);
    expect(displaced.longitude).toBeLessThanOrEqual(180);
  });
});

describe("public projection", () => {
  const base = {
    location: {
      coordinate: HOME,
      city: "Paris",
      postalCode: "75001",
      countryCode: "fr",
    },
    subjectId: "listing-1",
    radiusMeters: RADIUS,
    secret: SECRET,
  };

  it("publishes a displaced point for an approximate listing", () => {
    const projected = projectPublicLocation({
      ...base,
      precision: "approximate",
    });
    expect(projected.precision).toBe("approximate");
    expect(projected.coordinate).toBeDefined();
    expect(projected.coordinate).not.toEqual(HOME);
  });

  it("publishes no point at all when the precision is hidden", () => {
    const projected = projectPublicLocation({ ...base, precision: "hidden" });
    expect(projected.coordinate).toBeUndefined();
    expect(projected.precision).toBe("hidden");
    // The town still travels: a listing with no map is not a listing with no place.
    expect(projected.city).toBe("Paris");
  });

  it("publishes the true point only when the policy says exact", () => {
    expect(
      projectPublicLocation({ ...base, precision: "exact" }).coordinate,
    ).toEqual(HOME);
  });

  it("falls back to hidden when the stored point is unusable", () => {
    for (const coordinate of [
      null,
      { latitude: 0, longitude: 0 },
      { latitude: 999, longitude: 0 },
    ]) {
      const projected = projectPublicLocation({
        ...base,
        location: { ...base.location, coordinate },
        precision: "approximate",
      });
      expect(projected.precision).toBe("hidden");
      expect(projected.coordinate).toBeUndefined();
    }
  });

  it("uppercases the country and rounds the distance to 100 m", () => {
    const projected = projectPublicLocation({
      ...base,
      precision: "city",
      distanceKm: 12.3456,
    });
    expect(projected.countryCode).toBe("FR");
    expect(projected.distanceKm).toBe(12.3);
  });
});
