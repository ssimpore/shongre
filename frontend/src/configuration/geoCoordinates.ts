import { resolveApproximatePlace } from "@shongre/contracts/place-gazetteer";

/** Market-aware public coordinates shared by map-capable search surfaces. */

export interface CityCoordinates {
  lat: number;
  lng: number;
  name: string;
  department?: string;
  zoom?: number;
}

export const FRENCH_MAJOR_CITIES: Record<string, CityCoordinates> = {
  paris: { lat: 48.8566, lng: 2.3522, name: "Paris", zoom: 12 },
  lyon: { lat: 45.764, lng: 4.8357, name: "Lyon", zoom: 12 },
  marseille: { lat: 43.2965, lng: 5.3698, name: "Marseille", zoom: 12 },
  bordeaux: { lat: 44.8378, lng: -0.5792, name: "Bordeaux", zoom: 12 },
  toulouse: { lat: 43.6047, lng: 1.4442, name: "Toulouse", zoom: 12 },
  nantes: { lat: 47.2184, lng: -1.5536, name: "Nantes", zoom: 12 },
  lille: { lat: 50.6292, lng: 3.0573, name: "Lille", zoom: 12 },
  strasbourg: { lat: 48.5734, lng: 7.7521, name: "Strasbourg", zoom: 12 },
  nice: { lat: 43.7102, lng: 7.262, name: "Nice", zoom: 12 },
  rennes: { lat: 48.1173, lng: -1.6778, name: "Rennes", zoom: 12 },
  montpellier: { lat: 43.6108, lng: 3.8767, name: "Montpellier", zoom: 12 },
  grenoble: { lat: 45.1885, lng: 5.7245, name: "Grenoble", zoom: 12 },
  rouen: { lat: 49.4432, lng: 1.0999, name: "Rouen", zoom: 12 },
  reims: { lat: 49.2583, lng: 4.0317, name: "Reims", zoom: 12 },
  toulon: { lat: 43.1242, lng: 5.928, name: "Toulon", zoom: 12 },
  angers: { lat: 47.4784, lng: -0.5632, name: "Angers", zoom: 12 },
  dijon: { lat: 47.322, lng: 5.0415, name: "Dijon", zoom: 12 },
  brest: { lat: 48.3904, lng: -4.4861, name: "Brest", zoom: 12 },
  "clermont-ferrand": {
    lat: 45.7772,
    lng: 3.087,
    name: "Clermont-Ferrand",
    zoom: 12,
  },
  tours: { lat: 47.3941, lng: 0.6848, name: "Tours", zoom: 12 },
  amiens: { lat: 49.8941, lng: 2.2958, name: "Amiens", zoom: 12 },
  limoges: { lat: 45.8336, lng: 1.2611, name: "Limoges", zoom: 12 },
  metz: { lat: 49.1193, lng: 6.1757, name: "Metz", zoom: 12 },
  besancon: { lat: 47.2378, lng: 6.0241, name: "Besançon", zoom: 12 },
  orleans: { lat: 47.9029, lng: 1.9093, name: "Orléans", zoom: 12 },
  caen: { lat: 49.1829, lng: -0.3707, name: "Caen", zoom: 12 },
  perpignan: { lat: 42.6886, lng: 2.8948, name: "Perpignan", zoom: 12 },
  bayonne: { lat: 43.4929, lng: -1.4748, name: "Bayonne", zoom: 12 },
  annecy: { lat: 45.8992, lng: 6.1294, name: "Annecy", zoom: 12 },
  avignon: { lat: 43.9493, lng: 4.8055, name: "Avignon", zoom: 12 },
  poitiers: { lat: 46.5802, lng: 0.3404, name: "Poitiers", zoom: 12 },
  larochelle: { lat: 46.1603, lng: -1.1511, name: "La Rochelle", zoom: 12 },
  biarritz: { lat: 43.4832, lng: -1.5586, name: "Biarritz", zoom: 12 },
  ecully: { lat: 45.7746, lng: 4.778, name: "Écully", zoom: 12 },
  "saint-priest": {
    lat: 45.696,
    lng: 4.9447,
    name: "Saint-Priest",
    zoom: 12,
  },
  villeurbanne: { lat: 45.7679, lng: 4.8797, name: "Villeurbanne", zoom: 12 },
  "boulogne-billancourt": {
    lat: 48.8352,
    lng: 2.2409,
    name: "Boulogne-Billancourt",
    zoom: 12,
  },
};

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
