import { resolveApproximatePlace } from "@shongre/contracts/place-gazetteer";
import {
  FRENCH_MAJOR_CITIES,
  type CityCoordinates,
} from "./french-major-cities";

/** Market-aware public coordinates shared by map-capable search surfaces. */

export { FRENCH_MAJOR_CITIES } from "./french-major-cities";
export type { CityCoordinates } from "./french-major-cities";

const FRANCE_CENTER = {
  lat: 46.603354,
  lng: 1.888334,
  zoom: 6,
};

export interface MarketMapConfiguration {
  center: { lat: number; lng: number; zoom: number };
  cities: Record<string, CityCoordinates>;
}

export interface PublicMapLocation {
  id: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  marketCode?: string;
}

const MARKET_MAP_CONFIGURATIONS: Record<string, MarketMapConfiguration> = {
  FR: { center: FRANCE_CENTER, cities: FRENCH_MAJOR_CITIES },
  BE: {
    center: { lat: 50.5039, lng: 4.4699, zoom: 8 },
    cities: {
      bruxelles: { lat: 50.8503, lng: 4.3517, name: "Bruxelles", zoom: 12 },
      anvers: { lat: 51.2194, lng: 4.4025, name: "Anvers", zoom: 12 },
      liege: { lat: 50.6326, lng: 5.5797, name: "Liège", zoom: 12 },
      gand: { lat: 51.0543, lng: 3.7174, name: "Gand", zoom: 12 },
    },
  },
  CH: {
    center: { lat: 46.8182, lng: 8.2275, zoom: 8 },
    cities: {
      geneve: { lat: 46.2044, lng: 6.1432, name: "Genève", zoom: 12 },
      lausanne: { lat: 46.5197, lng: 6.6323, name: "Lausanne", zoom: 12 },
      zurich: { lat: 47.3769, lng: 8.5417, name: "Zurich", zoom: 12 },
      berne: { lat: 46.948, lng: 7.4474, name: "Berne", zoom: 12 },
    },
  },
  ES: {
    center: { lat: 40.4637, lng: -3.7492, zoom: 6 },
    cities: {
      madrid: { lat: 40.4168, lng: -3.7038, name: "Madrid", zoom: 12 },
      barcelone: { lat: 41.3874, lng: 2.1686, name: "Barcelone", zoom: 12 },
      valence: { lat: 39.4699, lng: -0.3763, name: "Valence", zoom: 12 },
      seville: { lat: 37.3891, lng: -5.9845, name: "Séville", zoom: 12 },
    },
  },
  LU: {
    center: { lat: 49.8153, lng: 6.1296, zoom: 9 },
    cities: {
      luxembourg: {
        lat: 49.6116,
        lng: 6.1319,
        name: "Luxembourg",
        zoom: 12,
      },
    },
  },
};

export function getMarketMapConfiguration(
  marketCode?: string,
): MarketMapConfiguration {
  return (
    MARKET_MAP_CONFIGURATIONS[(marketCode || "").toUpperCase()] ||
    MARKET_MAP_CONFIGURATIONS.FR
  );
}

/**
 * Resolve only public coordinates that can be placed honestly on a results map.
 *
 * Explicit API coordinates win. A public city label may fall back to the
 * configured market city centre with deterministic coarse spreading so markers
 * remain selectable. Unknown locations return `undefined` instead of being
 * misleadingly placed at the market centre.
 */
export function resolvePublicMapCoordinates(
  location: PublicMapLocation,
): { lat: number; lng: number } | undefined {
  if (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  ) {
    return { lat: location.latitude!, lng: location.longitude! };
  }

  /*
   * One gazetteer, in contracts, shared with the backend projection and the
   * detail page. This file used to keep a second, smaller table of its own and
   * match against it with a substring test, which meant the two surfaces could
   * disagree about where a town is and "Ussel" could match "Brest".
   */
  const base = resolveApproximatePlace({
    city: location.city,
    marketCode: location.marketCode,
  });
  if (!base) return undefined;

  let hash = 0;
  for (let index = 0; index < location.id.length; index += 1) {
    hash = (hash << 5) - hash + location.id.charCodeAt(index);
    hash |= 0;
  }

  // Deterministic spreading so two listings in the same town do not stack into
  // one unselectable marker on a results map. Metres, not a claim about where
  // anything is.
  return {
    lat: base.latitude + ((Math.abs(hash) % 31) - 15) * 0.00035,
    lng: base.longitude + ((Math.abs(hash >> 3) % 31) - 15) * 0.0005,
  };
}
