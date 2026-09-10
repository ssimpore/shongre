import { createHmac } from "node:crypto";
import {
  isValidCoordinate,
  type GeoCoordinate,
  type LocationPrecision,
  type PublicLocation,
} from "@shongre/contracts/geospatial";

/**
 * Turning a stored location into one that may be published.
 *
 * The stored point is the seller's actual position — for a private individual
 * that is their home. Publishing it, or publishing a point that changes on
 * every request, both fail in ways that are obvious in hindsight:
 *
 * - An exact point on a public listing is a home address with extra steps.
 * - A *randomly* displaced point leaks the true one anyway. Two requests give
 *   two samples around the same centre; a few hundred give the centre to within
 *   metres. Anyone who can reload a page can average it out.
 *
 * So the displacement is deterministic: derived by HMAC from the listing's own
 * identity and a server-held secret. The same listing always lands on the same
 * displaced point, no amount of sampling reveals anything more than the first
 * request did, and the true coordinate never leaves the row.
 */

/** Metres per degree of latitude. Constant enough at any latitude to use. */
const METERS_PER_DEGREE_LATITUDE = 111_320;

export interface LocationDisplacementInput {
  /** The real point. Never published, never logged. */
  coordinate: GeoCoordinate;
  /**
   * Stable identity of the thing being displaced — a listing id. The same id
   * must always produce the same offset, and two listings at the same address
   * must not produce the same one.
   */
  subjectId: string;
  radiusMeters: number;
  /** Server-held. Rotating it moves every approximate point, so treat it as fixed. */
  secret: string;
}

/**
 * A point offset from the real one by a fixed, unguessable amount.
 *
 * The offset is uniform over the disc rather than over (angle, radius): taking
 * the square root of the unit interval is what keeps the samples from bunching
 * at the centre, which would leave the true point in the densest part of the
 * distribution if it were ever plotted across many listings.
 */
export function displaceCoordinate({
  coordinate,
  subjectId,
  radiusMeters,
  secret,
}: LocationDisplacementInput): GeoCoordinate {
  const digest = createHmac("sha256", secret)
    .update(`${subjectId}:${radiusMeters}`)
    .digest();
  // Two independent 32-bit draws: one for the bearing, one for the radius.
  const angleUnit = digest.readUInt32BE(0) / 0xffffffff;
  const radiusUnit = digest.readUInt32BE(4) / 0xffffffff;

  const angle = angleUnit * 2 * Math.PI;
  const distance = radiusMeters * Math.sqrt(radiusUnit);

  const latitudeOffset =
    (distance * Math.cos(angle)) / METERS_PER_DEGREE_LATITUDE;
  const longitudeMetersPerDegree =
    METERS_PER_DEGREE_LATITUDE *
    Math.max(0.01, Math.cos((coordinate.latitude * Math.PI) / 180));
  const longitudeOffset =
    (distance * Math.sin(angle)) / longitudeMetersPerDegree;

  return {
    latitude: clamp(coordinate.latitude + latitudeOffset, -90, 90),
    longitude: wrapLongitude(coordinate.longitude + longitudeOffset),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrapLongitude(value: number): number {
  // A displacement near the antimeridian must come out the other side rather
  // than clamp to 180, which would put every such listing on the same line.
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

export interface StoredLocation {
  coordinate: GeoCoordinate | null;
  city?: string | null;
  postalCode?: string | null;
  administrativeArea?: string | null;
  countryCode?: string | null;
}

export interface PublicLocationInput {
  location: StoredLocation;
  /** The most revealing precision this listing's policy allows. */
  precision: LocationPrecision;
  subjectId: string;
  radiusMeters: number;
  secret: string;
  /** Present when the caller searched from somewhere and wants a distance. */
  distanceKm?: number;
}

/**
 * The only function allowed to build the location a public reader sees.
 *
 * Everything public goes through here so that "which precision does this
 * surface get" is one decision in one place. A caller cannot accidentally
 * publish a raw coordinate by forgetting a step, because the raw coordinate is
 * never part of the return type.
 */
export function projectPublicLocation({
  location,
  precision,
  subjectId,
  radiusMeters,
  secret,
  distanceKm,
}: PublicLocationInput): PublicLocation {
  const administrative = {
    ...(location.city ? { city: location.city } : {}),
    ...(location.postalCode ? { postalCode: location.postalCode } : {}),
    ...(location.administrativeArea
      ? { administrativeArea: location.administrativeArea }
      : {}),
    ...(location.countryCode
      ? { countryCode: location.countryCode.toUpperCase() }
      : {}),
    ...(distanceKm !== undefined && Number.isFinite(distanceKm)
      ? { distanceKm: Math.round(distanceKm * 10) / 10 }
      : {}),
  };

  if (precision === "hidden" || !isValidCoordinate(location.coordinate)) {
    // No point at all rather than a market centre: an invented position is an
    // answer, and it is wrong.
    return { precision: "hidden", ...administrative };
  }

  const coordinate = location.coordinate;
  if (precision === "exact") {
    return { precision, coordinate, ...administrative };
  }
  return {
    precision,
    coordinate: displaceCoordinate({
      coordinate,
      subjectId,
      radiusMeters,
      secret,
    }),
    ...administrative,
  };
}
