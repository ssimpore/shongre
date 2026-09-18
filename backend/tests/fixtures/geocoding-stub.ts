import { createServer, type Server } from "node:http";

/**
 * A Nominatim-shaped geocoder for the browser suite.
 *
 * The test profile defaults the geocoding provider to the public OpenStreetMap
 * instance, so the location journeys — "use my current position", the city
 * autocomplete — depended on an outside service, its rate limit and the
 * runner's network. They answered differently from one run to the next, and
 * on a machine without egress they simply timed out. This answers the same
 * two endpoints from a handful of towns the scenarios name, in the exact
 * shape the provider adapter reads, so the journeys prove the platform's own
 * handling rather than the weather at openstreetmap.org.
 */
interface StubPlace {
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  state: string;
  county: string;
  postcode: string;
}

const PLACES: readonly StubPlace[] = [
  {
    name: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    countryCode: "fr",
    state: "Île-de-France",
    county: "Paris",
    postcode: "75001",
  },
  {
    name: "Lyon",
    latitude: 45.764,
    longitude: 4.8357,
    countryCode: "fr",
    state: "Auvergne-Rhône-Alpes",
    county: "Métropole de Lyon",
    postcode: "69001",
  },
  {
    name: "Écully",
    latitude: 45.7742,
    longitude: 4.7768,
    countryCode: "fr",
    state: "Auvergne-Rhône-Alpes",
    county: "Métropole de Lyon",
    postcode: "69130",
  },
  {
    name: "Marseille",
    latitude: 43.2965,
    longitude: 5.3698,
    countryCode: "fr",
    state: "Provence-Alpes-Côte d'Azur",
    county: "Bouches-du-Rhône",
    postcode: "13001",
  },
  {
    name: "Bordeaux",
    latitude: 44.8378,
    longitude: -0.5792,
    countryCode: "fr",
    state: "Nouvelle-Aquitaine",
    county: "Gironde",
    postcode: "33000",
  },
  {
    name: "Nice",
    latitude: 43.7102,
    longitude: 7.262,
    countryCode: "fr",
    state: "Provence-Alpes-Côte d'Azur",
    county: "Alpes-Maritimes",
    postcode: "06000",
  },
  {
    name: "Toulouse",
    latitude: 43.6047,
    longitude: 1.4442,
    countryCode: "fr",
    state: "Occitanie",
    county: "Haute-Garonne",
    postcode: "31000",
  },
  {
    name: "Lille",
    latitude: 50.6292,
    longitude: 3.0573,
    countryCode: "fr",
    state: "Hauts-de-France",
    county: "Nord",
    postcode: "59000",
  },
  {
    name: "Nantes",
    latitude: 47.2184,
    longitude: -1.5536,
    countryCode: "fr",
    state: "Pays de la Loire",
    county: "Loire-Atlantique",
    postcode: "44000",
  },
  {
    name: "Boulogne-Billancourt",
    latitude: 48.8397,
    longitude: 2.2399,
    countryCode: "fr",
    state: "Île-de-France",
    county: "Hauts-de-Seine",
    postcode: "92100",
  },
  {
    name: "Bruxelles",
    latitude: 50.8503,
    longitude: 4.3517,
    countryCode: "be",
    state: "Région de Bruxelles-Capitale",
    county: "Bruxelles",
    postcode: "1000",
  },
  {
    name: "Liège",
    latitude: 50.6326,
    longitude: 5.5797,
    countryCode: "be",
    state: "Wallonie",
    county: "Liège",
    postcode: "4000",
  },
];

/** Reverse lookups accept a town-sized disc; beyond it there is no answer. */
const REVERSE_RADIUS_KM = 25;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function nominatimPlace(place: StubPlace) {
  return {
    place_id: Math.abs(
      [...place.name].reduce((hash, char) => hash * 31 + char.charCodeAt(0), 7),
    ),
    lat: String(place.latitude),
    lon: String(place.longitude),
    display_name: `${place.name}, ${place.county}, ${place.state}, ${place.countryCode.toUpperCase()}`,
    importance: 0.8,
    addresstype: "city",
    type: "city",
    class: "place",
    address: {
      country_code: place.countryCode,
      state: place.state,
      county: place.county,
      city: place.name,
      postcode: place.postcode,
    },
  };
}

export function createGeocodingStub(): Server {
  return createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const answer = (status: number, body: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (url.pathname === "/reverse") {
      const coordinate = {
        latitude: Number(url.searchParams.get("lat")),
        longitude: Number(url.searchParams.get("lon")),
      };
      if (
        !Number.isFinite(coordinate.latitude) ||
        !Number.isFinite(coordinate.longitude)
      ) {
        answer(400, { error: "Invalid coordinates" });
        return;
      }
      const nearest = [...PLACES]
        .map((place) => ({ place, distance: distanceKm(place, coordinate) }))
        .sort((left, right) => left.distance - right.distance)[0];
      if (!nearest || nearest.distance > REVERSE_RADIUS_KM) {
        answer(200, { error: "Unable to geocode" });
        return;
      }
      answer(200, nominatimPlace(nearest.place));
      return;
    }
    if (url.pathname === "/search") {
      const query = normalize(url.searchParams.get("q") || "");
      const countryCodes = (url.searchParams.get("countrycodes") || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      const limit = Math.max(1, Number(url.searchParams.get("limit")) || 5);
      const matches = query
        ? PLACES.filter(
            (place) =>
              (countryCodes.length === 0 ||
                countryCodes.includes(place.countryCode)) &&
              normalize(place.name).startsWith(query),
          )
        : [];
      answer(200, matches.slice(0, limit).map(nominatimPlace));
      return;
    }
    answer(404, { error: "Not found" });
  });
}
