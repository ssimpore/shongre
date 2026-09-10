import { z } from "zod";
import { marketCodeSchema } from "./primitives";

/**
 * The shared vocabulary for "where something is".
 *
 * Web, native and the backend all had their own idea of a coordinate: the Web
 * carried `{ lat, lng }` in its map configuration, the public projection
 * carried `{ latitude, longitude }`, the real-estate vertical carried a
 * `location_precision` the generic listing had no equivalent for, and only
 * PostGIS held an authoritative point. One vocabulary here means a coordinate
 * validated on the client is the same value the database constrains and the
 * same value the API returns.
 *
 * Nothing in this file talks to a provider. Provider adapters live behind the
 * backend's geospatial module; this is the type layer they agree on.
 */

export const GEO_LIMITS = {
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
  /** Beyond this a "nearby" search stops meaning anything and starts costing. */
  searchRadiusKm: { min: 1, max: 200 },
  /** A viewport wider than a small country is a table scan with a map on top. */
  boundingBoxSpanDegrees: { max: 20 },
  /** What a public "approximate" point may be displaced by. */
  privacyRadiusMeters: { min: 100, max: 5_000 },
  zoom: { min: 0, max: 22 },
  /** Autocomplete: shorter than this matches half a country. */
  addressQuery: { minLength: 3, maxLength: 160 },
} as const;

export const latitudeSchema = z
  .number()
  .min(GEO_LIMITS.latitude.min)
  .max(GEO_LIMITS.latitude.max);
export const longitudeSchema = z
  .number()
  .min(GEO_LIMITS.longitude.min)
  .max(GEO_LIMITS.longitude.max);

export const geoCoordinateSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});
export type GeoCoordinate = z.infer<typeof geoCoordinateSchema>;

export const geoBoundingBoxSchema = z
  .object({
    north: latitudeSchema,
    south: latitudeSchema,
    east: longitudeSchema,
    west: longitudeSchema,
  })
  .refine((box) => box.north >= box.south, {
    message: "north must not be below south",
  });
export type GeoBoundingBox = z.infer<typeof geoBoundingBoxSchema>;

/**
 * How precisely a location may be shown to the public.
 *
 * `exact` is the seller's actual point and is never a public value for a
 * private individual; `approximate` is a deterministically displaced point;
 * `city` and `postal_code` are administrative centroids; `hidden` publishes no
 * point at all. The order is deliberate — index 0 is the most revealing — so
 * a policy can be compared rather than enumerated.
 */
export const LOCATION_PRECISIONS = [
  "exact",
  "approximate",
  "city",
  "postal_code",
  "hidden",
] as const;
export const locationPrecisionSchema = z.enum(LOCATION_PRECISIONS);
export type LocationPrecision = z.infer<typeof locationPrecisionSchema>;

/** Where a stored coordinate came from, which decides how much to trust it. */
export const LOCATION_SOURCES = [
  /** The publisher dropped or dragged a marker. */
  "user_pin",
  /** A geocoding provider resolved a written address. */
  "geocoded",
  /** The built-in place table answered a town name. */
  "gazetteer",
  /** The device's own positioning, with explicit permission. */
  "device",
  /** A bulk import or a legacy row. */
  "imported",
] as const;
export const locationSourceSchema = z.enum(LOCATION_SOURCES);
export type LocationSource = z.infer<typeof locationSourceSchema>;

/** How sure the resolver is. Callers may refuse to store a low-confidence hit. */
export const GEOCODING_CONFIDENCES = ["high", "medium", "low"] as const;
export const geocodingConfidenceSchema = z.enum(GEOCODING_CONFIDENCES);
export type GeocodingConfidence = z.infer<typeof geocodingConfidenceSchema>;

/**
 * A resolved place, as both the geocoder and the listing row describe it.
 *
 * Administrative fields stay separate from the free-text address because search
 * filters on them and normalization must not have to re-parse a string.
 */
export const resolvedAddressSchema = z.object({
  countryCode: marketCodeSchema,
  administrativeArea: z.string().max(160).optional(),
  departmentOrRegion: z.string().max(160).optional(),
  city: z.string().max(160).optional(),
  postalCode: z.string().max(20).optional(),
  /** One line, normalized: what a human would read back. */
  normalizedAddress: z.string().max(400).optional(),
});
export type ResolvedAddress = z.infer<typeof resolvedAddressSchema>;

export const geocodingResultSchema = resolvedAddressSchema.extend({
  coordinate: geoCoordinateSchema,
  precision: locationPrecisionSchema,
  confidence: geocodingConfidenceSchema,
  /** Licence and policy travel with the answer, never with the component. */
  attribution: z.string().min(1),
  provider: z.string().min(1),
});
export type GeocodingResult = z.infer<typeof geocodingResultSchema>;

/**
 * What a public reader is allowed to know about where a listing is.
 *
 * There is no `latitude`/`longitude` pair at the top level on purpose: a
 * consumer must read `coordinate` together with `precision` or not at all, so
 * "approximate" cannot be silently rendered as a doorstep. `coordinate` is
 * absent — not zeroed — when the precision is `hidden` or nothing resolved.
 */
export const publicLocationSchema = z.object({
  coordinate: geoCoordinateSchema.optional(),
  precision: locationPrecisionSchema,
  city: z.string().max(160).optional(),
  postalCode: z.string().max(20).optional(),
  administrativeArea: z.string().max(160).optional(),
  countryCode: marketCodeSchema.optional(),
  /** Kilometres from the origin the caller searched from, when it supplied one. */
  distanceKm: z.number().nonnegative().optional(),
});
export type PublicLocation = z.infer<typeof publicLocationSchema>;

/** Search parameters every map-capable surface shares. */
export const geoSearchQuerySchema = z
  .object({
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    radiusKm: z
      .number()
      .min(GEO_LIMITS.searchRadiusKm.min)
      .max(GEO_LIMITS.searchRadiusKm.max)
      .optional(),
    boundingBox: geoBoundingBoxSchema.optional(),
    countryCode: marketCodeSchema.optional(),
    city: z.string().max(160).optional(),
    postalCode: z.string().max(20).optional(),
  })
  .refine(
    (query) =>
      query.radiusKm === undefined ||
      (query.latitude !== undefined && query.longitude !== undefined),
    { message: "a radius needs a centre" },
  );
export type GeoSearchQuery = z.infer<typeof geoSearchQuerySchema>;

export const mapViewportSchema = z.object({
  center: geoCoordinateSchema,
  zoom: z.number().min(GEO_LIMITS.zoom.min).max(GEO_LIMITS.zoom.max),
});
export type MapViewport = z.infer<typeof mapViewportSchema>;

/**
 * The map configuration a browser or device is allowed to hold.
 *
 * Style URL and attribution only: no key, no server endpoint, nothing that
 * would let a client geocode directly.
 */
export const publicMapConfigSchema = z.object({
  provider: z.string().min(1),
  styleUrl: z.string().min(1),
  attribution: z.string().min(1),
  defaultCenter: geoCoordinateSchema,
  defaultZoom: z.number().min(GEO_LIMITS.zoom.min).max(GEO_LIMITS.zoom.max),
  minZoom: z.number().min(GEO_LIMITS.zoom.min).max(GEO_LIMITS.zoom.max),
  maxZoom: z.number().min(GEO_LIMITS.zoom.min).max(GEO_LIMITS.zoom.max),
  maxSearchRadiusKm: z
    .number()
    .min(GEO_LIMITS.searchRadiusKm.min)
    .max(GEO_LIMITS.searchRadiusKm.max),
});
export type PublicMapConfig = z.infer<typeof publicMapConfigSchema>;

const EARTH_RADIUS_KM = 6_371.0088;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function isValidCoordinate(
  value: Partial<GeoCoordinate> | null | undefined,
): value is GeoCoordinate {
  if (!value) return false;
  const { latitude, longitude } = value;
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= GEO_LIMITS.latitude.min &&
    latitude <= GEO_LIMITS.latitude.max &&
    longitude >= GEO_LIMITS.longitude.min &&
    longitude <= GEO_LIMITS.longitude.max &&
    // Null Island is the shape a missing coordinate takes when something
    // defaulted a number to zero, and it is in the Gulf of Guinea.
    !(latitude === 0 && longitude === 0)
  );
}

/** Great-circle distance in kilometres. Display and sorting, not filtering. */
export function distanceKmBetween(
  from: GeoCoordinate,
  to: GeoCoordinate,
): number {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** The box a radius search covers, for a viewport or a coarse pre-filter. */
export function boundingBoxAround(
  center: GeoCoordinate,
  radiusKm: number,
): GeoBoundingBox {
  const latitudeDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  // Meridians converge, so a kilometre is worth more degrees of longitude the
  // further from the equator you go. The clamp keeps the divisor away from zero
  // at the poles, where the box would otherwise span the whole world.
  const longitudeDelta =
    latitudeDelta /
    Math.max(
      0.01,
      Math.cos(toRadians(Math.min(89, Math.abs(center.latitude)))),
    );
  return {
    north: Math.min(GEO_LIMITS.latitude.max, center.latitude + latitudeDelta),
    south: Math.max(GEO_LIMITS.latitude.min, center.latitude - latitudeDelta),
    east: Math.min(GEO_LIMITS.longitude.max, center.longitude + longitudeDelta),
    west: Math.max(GEO_LIMITS.longitude.min, center.longitude - longitudeDelta),
  };
}

export function boundingBoxContains(
  box: GeoBoundingBox,
  point: GeoCoordinate,
): boolean {
  const withinLatitude =
    point.latitude <= box.north && point.latitude >= box.south;
  // A box dragged across the antimeridian has east < west; it is two ranges.
  const withinLongitude =
    box.west <= box.east
      ? point.longitude >= box.west && point.longitude <= box.east
      : point.longitude >= box.west || point.longitude <= box.east;
  return withinLatitude && withinLongitude;
}

/**
 * Whether a viewport is small enough to answer.
 *
 * A request for the whole planet is not a map search, it is an unbounded query
 * wearing one, and refusing it here keeps that decision next to the limit it
 * enforces rather than in each caller.
 */
export function boundingBoxIsWithinLimits(box: GeoBoundingBox): boolean {
  const latitudeSpan = box.north - box.south;
  const longitudeSpan =
    box.west <= box.east ? box.east - box.west : 360 - box.west + box.east;
  return (
    latitudeSpan >= 0 &&
    latitudeSpan <= GEO_LIMITS.boundingBoxSpanDegrees.max &&
    longitudeSpan <= GEO_LIMITS.boundingBoxSpanDegrees.max
  );
}

/** True when the precision permits publishing a point at all. */
export function precisionPublishesPoint(precision: LocationPrecision): boolean {
  return precision !== "hidden";
}

/**
 * Whether `candidate` reveals at least as much as `floor` allows.
 *
 * Policies are expressed as the *most* revealing precision a surface may use,
 * so comparing them is an index comparison rather than a chain of equalities.
 */
export function precisionIsAtLeastAsCoarse(
  candidate: LocationPrecision,
  floor: LocationPrecision,
): boolean {
  return (
    LOCATION_PRECISIONS.indexOf(candidate) >= LOCATION_PRECISIONS.indexOf(floor)
  );
}
