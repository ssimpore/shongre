import { MarketCity } from "./market.types";
import { resolveCountryFromCoordinates } from "@shongre/contracts";
import { MARKET_CITY_COORDINATES } from "../../configuration/market-city-coordinates";

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type GeolocationFailureCode =
  | "unsupported"
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "outside_market"
  | "unresolved";

export class CurrentLocationError extends Error {
  constructor(public readonly code: GeolocationFailureCode) {
    super(code);
    this.name = "CurrentLocationError";
  }
}

export interface ResolvedCurrentLocation {
  coordinates: GeoCoordinates;
  city: MarketCity;
  distanceKm: number;
}

type CityPoint = { latitude: number; longitude: number };

const normalizeCity = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceBetweenKm = (
  from: GeoCoordinates,
  to: CityPoint,
): number => {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const cityPoint = (marketCode: string, cityName: string): CityPoint | null => {
  const normalized = normalizeCity(cityName);
  return MARKET_CITY_COORDINATES[marketCode]?.[normalized] || null;
};

export const resolveNearestMarketCity = (
  coordinates: GeoCoordinates,
  marketCode: string,
  cities: MarketCity[],
): ResolvedCurrentLocation => {
  const country = resolveCountryFromCoordinates(coordinates).country;
  if (!country || country.code !== marketCode) {
    throw new CurrentLocationError("outside_market");
  }

  const candidates = cities.flatMap((city) => {
    const point = cityPoint(marketCode, city.name);
    return point
      ? [{ city, distanceKm: distanceBetweenKm(coordinates, point) }]
      : [];
  });
  const nearest = candidates.sort((a, b) => a.distanceKm - b.distanceKm)[0];
  if (!nearest) throw new CurrentLocationError("unresolved");

  return { coordinates, ...nearest };
};

export const requestCurrentCoordinates = (
  provider: Geolocation | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.geolocation,
): Promise<GeoCoordinates> => {
  if (!provider) {
    return Promise.reject(new CurrentLocationError("unsupported"));
  }

  return new Promise((resolve, reject) => {
    provider.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (error) => {
        const code: GeolocationFailureCode =
          error.code === 1
            ? "permission_denied"
            : error.code === 2
              ? "position_unavailable"
              : error.code === 3
                ? "timeout"
                : "position_unavailable";
        reject(new CurrentLocationError(code));
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60_000,
      },
    );
  });
};

export const locateCurrentCity = async (
  marketCode: string,
  cities: MarketCity[],
  provider?: Geolocation,
): Promise<ResolvedCurrentLocation> => {
  const coordinates = await requestCurrentCoordinates(provider);
  return resolveNearestMarketCity(coordinates, marketCode, cities);
};
