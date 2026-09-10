import { describe, expect, it } from "vitest";
import type { GeocodingResult } from "@shongre/contracts/geospatial";
import {
  backfillQuery,
  decideBackfill,
  emptyBackfillReport,
  recordDecision,
  rejectsBulkGeocodingEndpoint,
} from "../../src/modules/geo/geo.backfill.js";

const candidate = (
  overrides: Partial<Parameters<typeof decideBackfill>[0]> = {},
) => ({
  id: "listing-1",
  city: "Bordeaux",
  postalCode: "33000",
  countryCode: "FR",
  ...overrides,
});

const result = (overrides: Partial<GeocodingResult> = {}): GeocodingResult => ({
  coordinate: { latitude: 44.8378, longitude: -0.5792 },
  countryCode: "FR",
  city: "Bordeaux",
  postalCode: "33000",
  administrativeArea: "Nouvelle-Aquitaine",
  normalizedAddress: "Bordeaux, Gironde, France",
  precision: "city",
  confidence: "high",
  attribution: "© OpenStreetMap contributors",
  provider: "nominatim",
  ...overrides,
});

describe("what the backfill asks", () => {
  it("sends a town and a postcode, never a private address", () => {
    expect(backfillQuery(candidate())).toBe("33000 Bordeaux");
    expect(backfillQuery(candidate({ postalCode: null }))).toBe("Bordeaux");
    expect(backfillQuery(candidate({ city: null }))).toBe("33000");
  });

  it("has nothing to ask when the row names no place", () => {
    expect(
      backfillQuery(candidate({ city: null, postalCode: null })),
    ).toBeNull();
    expect(backfillQuery(candidate({ city: "  ", postalCode: "" }))).toBeNull();
  });
});

describe("what the backfill will store", () => {
  it("stores a resolved town at town precision", () => {
    const decision = decideBackfill(candidate(), [result()]);
    expect(decision).toMatchObject({
      action: "store",
      precision: "city",
      coordinate: { latitude: 44.8378, longitude: -0.5792 },
      provider: "nominatim",
    });
  });

  it("records postcode precision only when a postcode was supplied", () => {
    expect(
      decideBackfill(candidate(), [result({ precision: "postal_code" })]),
    ).toMatchObject({ precision: "postal_code" });
    expect(
      decideBackfill(candidate({ postalCode: null }), [
        result({ precision: "postal_code" }),
      ]),
    ).toMatchObject({ precision: "city" });
  });

  it("never claims a precision finer than the question it asked", () => {
    /*
     * The query is a town. A provider answering `exact` has resolved something
     * the platform never asked about, and recording that would turn "somewhere
     * in Bordeaux" into an address on the strength of data nobody entered.
     */
    for (const precision of ["exact", "approximate"] as const) {
      const decision = decideBackfill(candidate(), [result({ precision })]);
      expect(decision).toMatchObject({ action: "store" });
      expect(decision.action === "store" ? decision.precision : null).toBe(
        "city",
      );
    }
  });
});

describe("what the backfill refuses", () => {
  it("refuses a row with no place to resolve", () => {
    expect(
      decideBackfill(candidate({ city: null, postalCode: null }), [result()]),
    ).toEqual({ action: "skip", reason: "no_address" });
  });

  it("refuses when the provider knew nothing", () => {
    expect(decideBackfill(candidate(), [])).toEqual({
      action: "skip",
      reason: "unresolved",
    });
  });

  it("refuses an answer from another country", () => {
    expect(
      decideBackfill(candidate(), [result({ countryCode: "BE" })]),
    ).toEqual({ action: "skip", reason: "wrong_market" });
  });

  it("refuses a low-confidence hit rather than guessing at scale", () => {
    // Usually a different town with a similar name, in the same country, at
    // the wrong end of it — and nothing downstream can tell it from a good one.
    expect(
      decideBackfill(candidate(), [result({ confidence: "low" })]),
    ).toEqual({ action: "skip", reason: "low_confidence" });
    expect(
      decideBackfill(candidate(), [result({ confidence: "medium" })]),
    ).toMatchObject({ action: "store" });
  });

  it("refuses a coordinate that is not a place on Earth", () => {
    for (const coordinate of [
      { latitude: 0, longitude: 0 },
      { latitude: 200, longitude: 0 },
      { latitude: Number.NaN, longitude: 2 },
    ]) {
      expect(decideBackfill(candidate(), [result({ coordinate })])).toEqual({
        action: "skip",
        reason: "invalid_coordinate",
      });
    }
  });
});

describe("the report", () => {
  it("counts every decision exactly once, by outcome", () => {
    const report = emptyBackfillReport();
    recordDecision(report, decideBackfill(candidate(), [result()]));
    recordDecision(report, decideBackfill(candidate(), []));
    recordDecision(
      report,
      decideBackfill(candidate(), [result({ confidence: "low" })]),
    );
    expect(report.attempted).toBe(3);
    expect(report.stored).toBe(1);
    expect(report.skipped.unresolved).toBe(1);
    expect(report.skipped.low_confidence).toBe(1);
  });
});

describe("bulk endpoint safety", () => {
  it("refuses the public OpenStreetMap instance in every environment", () => {
    /*
     * The interactive path may use it on a laptop; a backfill may not, anywhere.
     * Bulk use is the thing that endpoint's policy names and forbids, and it is
     * the fastest way to have the platform blocked.
     */
    expect(
      rejectsBulkGeocodingEndpoint("https://nominatim.openstreetmap.org"),
    ).toBe(true);
    expect(
      rejectsBulkGeocodingEndpoint(
        "https://nominatim.openstreetmap.org/search",
      ),
    ).toBe(true);
  });

  it("accepts an endpoint the operator runs", () => {
    expect(rejectsBulkGeocodingEndpoint("https://geocoder.shongre.fr")).toBe(
      false,
    );
    expect(rejectsBulkGeocodingEndpoint("http://127.0.0.1:8080")).toBe(false);
  });

  it("refuses anything it cannot parse rather than assuming it is safe", () => {
    expect(rejectsBulkGeocodingEndpoint("")).toBe(true);
    expect(rejectsBulkGeocodingEndpoint("not-a-url")).toBe(true);
  });
});
