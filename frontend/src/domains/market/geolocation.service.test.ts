import { describe, expect, it, vi } from "vitest";
import {
  CurrentLocationError,
  locateCurrentCity,
  normalizeCityName,
  requestCurrentCoordinates,
  resolveNearestMarketCity,
} from "./geolocation.service";
import { resolveApproximatePlace } from "@shongre/contracts/place-gazetteer";
import { MARKET_CITY_COORDINATES } from "../../configuration/market-city-coordinates";
import { MARKET_POPULAR_CITIES } from "../../configuration/market-popular-cities";

const franceCities = [
  { name: "Paris", postalCode: "75000", region: "Île-de-France" },
  { name: "Lyon", postalCode: "69000", region: "Auvergne-Rhône-Alpes" },
];

describe("geolocation service", () => {
  it("resolves browser coordinates to the nearest city in the active market", () => {
    const result = resolveNearestMarketCity(
      { latitude: 48.86, longitude: 2.35 },
      "FR",
      franceCities,
    );

    expect(result.city.name).toBe("Paris");
    expect(result.distanceKm).toBeLessThan(2);
  });

  it("keeps resolution scoped to the selected market", () => {
    const result = resolveNearestMarketCity(
      { latitude: 50.85, longitude: 4.35 },
      "BE",
      [
        { name: "Bruxelles", postalCode: "1000", region: "Bruxelles-Capitale" },
        { name: "Liège", postalCode: "4000", region: "Wallonie" },
      ],
    );

    expect(result.city.name).toBe("Bruxelles");
  });

  it("labels a position from the market's own shortlist of towns", () => {
    // The shortlist is what the picker offers and what a browser position
    // resolves against; an empty one turns "use my position" into an error
    // on every market. Every shortlisted town must carry a coordinate.
    for (const [marketCode, cities] of Object.entries(MARKET_POPULAR_CITIES)) {
      expect(cities.length, marketCode).toBeGreaterThan(3);
      for (const city of cities) {
        expect(
          MARKET_CITY_COORDINATES[marketCode]?.[normalizeCityName(city.name)],
          `${marketCode}: ${city.name} has a coordinate`,
        ).toBeDefined();
      }
    }
    expect(
      resolveNearestMarketCity({ latitude: 48.8566, longitude: 2.3522 }, "FR", [
        ...MARKET_POPULAR_CITIES.FR,
      ]).city.name,
    ).toBe("Paris");
    expect(
      resolveNearestMarketCity({ latitude: 50.6326, longitude: 5.5797 }, "BE", [
        ...MARKET_POPULAR_CITIES.BE,
      ]).city.name,
    ).toBe("Liège");
  });

  it("falls back to a supplied resolver for towns without a configured point", () => {
    // The provider passes the shared gazetteer, loaded on demand.
    const result = resolveNearestMarketCity(
      { latitude: 14.72, longitude: -17.46 },
      "SN",
      [
        { name: "Dakar", postalCode: "", region: "Dakar" },
        { name: "Thiès", postalCode: "", region: "Thiès" },
      ],
      (marketCode, cityName) => {
        const place = resolveApproximatePlace({ city: cityName, marketCode });
        return place
          ? { latitude: place.latitude, longitude: place.longitude }
          : null;
      },
    );
    expect(result.city.name).toBe("Dakar");
    expect(result.distanceKm).toBeLessThan(2);
  });

  it("rejects coordinates outside the active market", () => {
    expect(() =>
      resolveNearestMarketCity(
        { latitude: 40.4168, longitude: -3.7038 },
        "FR",
        franceCities,
      ),
    ).toThrowError(new CurrentLocationError("outside_market"));
  });

  it("reads coordinates from the browser provider", async () => {
    const getCurrentPosition = vi.fn((success) =>
      success({
        coords: { latitude: 48.8566, longitude: 2.3522, accuracy: 20 },
      }),
    );
    const provider = { getCurrentPosition } as unknown as Geolocation;

    await expect(requestCurrentCoordinates(provider)).resolves.toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 20,
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("normalizes browser permission errors", async () => {
    const provider = {
      getCurrentPosition: (
        _success: unknown,
        error: (reason: { code: number }) => void,
      ) => error({ code: 1 }),
    } as unknown as Geolocation;

    await expect(
      locateCurrentCity("FR", franceCities, provider),
    ).rejects.toMatchObject({
      code: "permission_denied",
    });
  });

  it("reports unsupported browsers", async () => {
    await expect(requestCurrentCoordinates(undefined)).rejects.toMatchObject({
      code: "unsupported",
    });
  });
});
