import { describe, expect, it } from "vitest";
import { resolvePublicMapCoordinates } from "./geoCoordinates";

describe("resolvePublicMapCoordinates", () => {
  it("preserves explicit public API coordinates, including zero", () => {
    expect(
      resolvePublicMapCoordinates({
        id: "explicit",
        latitude: 0,
        longitude: 0,
      }),
    ).toEqual({ lat: 0, lng: 0 });
  });

  it("resolves a known public city label deterministically", () => {
    const input = {
      id: "vehicle-1",
      city: "Paris 11e",
      marketCode: "FR",
    };
    const first = resolvePublicMapCoordinates(input);
    const second = resolvePublicMapCoordinates(input);

    expect(first).toEqual(second);
    expect(first?.lat).toBeGreaterThan(48.84);
    expect(first?.lat).toBeLessThan(48.88);
    expect(first?.lng).toBeGreaterThan(2.33);
    expect(first?.lng).toBeLessThan(2.38);
  });

  it("does not place an unknown location at the market centre", () => {
    expect(
      resolvePublicMapCoordinates({
        id: "unknown",
        city: "Lieu non publié",
        marketCode: "FR",
      }),
    ).toBeUndefined();
  });
});
