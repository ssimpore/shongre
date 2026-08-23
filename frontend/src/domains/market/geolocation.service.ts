import { MarketCity } from "./market.types";
import { FRENCH_MAJOR_CITIES } from "../../configuration/geoCoordinates";

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

const NON_FRENCH_CITY_POINTS: Record<string, Record<string, CityPoint>> = {
  BE: {
    bruxelles: { latitude: 50.8503, longitude: 4.3517 },
    liege: { latitude: 50.6326, longitude: 5.5797 },
    namur: { latitude: 50.4674, longitude: 4.872 },
    anvers: { latitude: 51.2194, longitude: 4.4025 },
    gand: { latitude: 51.0543, longitude: 3.7174 },
    charleroi: { latitude: 50.4108, longitude: 4.4446 },
  },
  ES: {
    madrid: { latitude: 40.4168, longitude: -3.7038 },
    barcelona: { latitude: 41.3874, longitude: 2.1686 },
    valencia: { latitude: 39.4699, longitude: -0.3763 },
    sevilla: { latitude: 37.3891, longitude: -5.9845 },
    malaga: { latitude: 36.7213, longitude: -4.4214 },
  },
  CH: {
    geneve: { latitude: 46.2044, longitude: 6.1432 },
    lausanne: { latitude: 46.5197, longitude: 6.6323 },
    zurich: { latitude: 47.3769, longitude: 8.5417 },
    bale: { latitude: 47.5596, longitude: 7.5886 },
    berne: { latitude: 46.948, longitude: 7.4474 },
  },
  LU: {
    "luxembourg-ville": { latitude: 49.6116, longitude: 6.1319 },
    "esch-sur-alzette": { latitude: 49.4958, longitude: 5.9806 },
    differdange: { latitude: 49.5242, longitude: 5.8914 },
    dudelange: { latitude: 49.4806, longitude: 6.0875 },
  },
};

const MARKET_BOUNDS: Record<
  string,
  { north: number; south: number; east: number; west: number }
> = {
  FR: { north: 51.6, south: 41.0, east: 9.8, west: -5.6 },
  BE: { north: 51.6, south: 49.4, east: 6.5, west: 2.4 },
  ES: { north: 44.1, south: 35.6, east: 4.5, west: -9.6 },
  CH: { north: 48.0, south: 45.7, east: 10.7, west: 5.8 },
  LU: { north: 50.3, south: 49.3, east: 6.7, west: 5.6 },
};

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
  if (marketCode === "FR") {
    const frenchPoint = FRENCH_MAJOR_CITIES[normalized];
    return frenchPoint
      ? { latitude: frenchPoint.lat, longitude: frenchPoint.lng }
      : null;
  }
  return NON_FRENCH_CITY_POINTS[marketCode]?.[normalized] || null;
};

const isInsideMarket = (
  coordinates: GeoCoordinates,
  marketCode: string,
): boolean => {
  const bounds = MARKET_BOUNDS[marketCode];
  if (!bounds) return true;
  return (
    coordinates.latitude >= bounds.south &&
    coordinates.latitude <= bounds.north &&
    coordinates.longitude >= bounds.west &&
    coordinates.longitude <= bounds.east
  );
};

export const resolveNearestMarketCity = (
  coordinates: GeoCoordinates,
  marketCode: string,
  cities: MarketCity[],
): ResolvedCurrentLocation => {
  if (!isInsideMarket(coordinates, marketCode)) {
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
