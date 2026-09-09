import { describe, expect, it } from "vitest";
import { parseGeographyPoint } from "../../src/shared/geography.js";

/**
 * The hex strings below are the literal values PostgREST returns for the three
 * seeded properties — copied from the database, not constructed — because the
 * bug this pins was that nobody had ever looked at what the column actually
 * hands back.
 */
describe("geography point parsing", () => {
  it("reads the EWKB hex a geography column actually returns", () => {
    const cases: Array<[string, { latitude: number; longitude: number }]> = [
      [
        "0101000020E6100000E9263108AC1C13403333333333E34640",
        { longitude: 4.778, latitude: 45.775 },
      ],
      [
        "0101000020E6100000764F1E166A8D13402B1895D409E04640",
        { longitude: 4.8881, latitude: 45.7503 },
      ],
      [
        "0101000020E6100000029A081B9E5E1340D6C56D3480DF4640",
        { longitude: 4.8424, latitude: 45.7461 },
      ],
    ];
    for (const [hex, expected] of cases) {
      const point = parseGeographyPoint(hex);
      expect(point).not.toBeNull();
      expect(point!.latitude).toBeCloseTo(expected.latitude, 6);
      expect(point!.longitude).toBeCloseTo(expected.longitude, 6);
    }
  });

  it("still reads well-known text and GeoJSON, which other casts produce", () => {
    expect(parseGeographyPoint("POINT(4.8881 45.7503)")).toEqual({
      longitude: 4.8881,
      latitude: 45.7503,
    });
    expect(parseGeographyPoint("SRID=4326;POINT(-0.5792 44.8378)")).toEqual({
      longitude: -0.5792,
      latitude: 44.8378,
    });
    expect(
      parseGeographyPoint({ type: "Point", coordinates: [2.3522, 48.8566] }),
    ).toEqual({ longitude: 2.3522, latitude: 48.8566 });
  });

  it("answers null for absence instead of a coordinate in the Gulf of Guinea", () => {
    for (const value of [
      null,
      undefined,
      "",
      "   ",
      "not-a-point",
      {},
      { coordinates: [] },
      42,
      // A polygon has no single coordinate to report.
      "0103000020E610000001000000",
    ]) {
      expect(parseGeographyPoint(value)).toBeNull();
    }
  });

  it("rejects a coordinate that is out of range rather than passing it on", () => {
    // Longitude and latitude transposed at write time: 45.75 is not a longitude
    // this system can receive as a latitude of 200.
    expect(parseGeographyPoint({ coordinates: [4.8, 200] })).toBeNull();
    expect(parseGeographyPoint("POINT(4.8 91.2)")).toBeNull();
    expect(parseGeographyPoint({ coordinates: [181.5, 45.7] })).toBeNull();
  });

  it("reads big-endian EWKB, which a different driver may produce", () => {
    const point = parseGeographyPoint(
      "0020000001000010E640124CCCCCCCCCCD4016E83E425AEE63",
    );
    expect(point).not.toBeNull();
    expect(point!.longitude).toBeCloseTo(4.575, 3);
    expect(point!.latitude).toBeCloseTo(5.7268, 3);
  });
});
