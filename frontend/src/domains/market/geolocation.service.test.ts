import { describe, expect, it, vi } from "vitest";
import {
  CurrentLocationError,
  locateCurrentCity,
  requestCurrentCoordinates,
  resolveNearestMarketCity,
} from "./geolocation.service";

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
