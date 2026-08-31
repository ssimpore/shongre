import { getDefaultCountryConfig } from "@shongre/contracts";
import { FRENCH_MAJOR_CITIES } from "./geoCoordinates";

export interface ConfiguredCityCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Optional city-level presentation data. Country detection itself is owned by
 * COUNTRY_REGISTRY; adding an entry here only improves nearest-city labels.
 */
export const MARKET_CITY_COORDINATES: Readonly<
  Record<string, Readonly<Record<string, ConfiguredCityCoordinates>>>
> = Object.freeze({
  [getDefaultCountryConfig().code]: Object.freeze(
    Object.fromEntries(
      Object.entries(FRENCH_MAJOR_CITIES).map(([city, point]) => [
        city,
        { latitude: point.lat, longitude: point.lng },
      ]),
    ),
  ),
  BE: Object.freeze({
    bruxelles: { latitude: 50.8503, longitude: 4.3517 },
    liege: { latitude: 50.6326, longitude: 5.5797 },
    namur: { latitude: 50.4674, longitude: 4.872 },
    anvers: { latitude: 51.2194, longitude: 4.4025 },
    gand: { latitude: 51.0543, longitude: 3.7174 },
    charleroi: { latitude: 50.4108, longitude: 4.4446 },
  }),
  ES: Object.freeze({
    madrid: { latitude: 40.4168, longitude: -3.7038 },
    barcelona: { latitude: 41.3874, longitude: 2.1686 },
    valencia: { latitude: 39.4699, longitude: -0.3763 },
    sevilla: { latitude: 37.3891, longitude: -5.9845 },
    malaga: { latitude: 36.7213, longitude: -4.4214 },
  }),
  CH: Object.freeze({
    geneve: { latitude: 46.2044, longitude: 6.1432 },
    lausanne: { latitude: 46.5197, longitude: 6.6323 },
    zurich: { latitude: 47.3769, longitude: 8.5417 },
    bale: { latitude: 47.5596, longitude: 7.5886 },
    berne: { latitude: 46.948, longitude: 7.4474 },
  }),
  LU: Object.freeze({
    "luxembourg-ville": { latitude: 49.6116, longitude: 6.1319 },
    "esch-sur-alzette": { latitude: 49.4958, longitude: 5.9806 },
    differdange: { latitude: 49.5242, longitude: 5.8914 },
    dudelange: { latitude: 49.4806, longitude: 6.0875 },
  }),
});
