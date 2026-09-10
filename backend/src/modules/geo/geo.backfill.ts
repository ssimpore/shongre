import {
  isValidCoordinate,
  type GeoCoordinate,
  type GeocodingResult,
  type LocationPrecision,
} from "@shongre/contracts/geospatial";

/**
 * Deciding what a backfill may write for one listing.
 *
 * Kept separate from the command that runs it because the interesting part is
 * not the batching or the pacing — it is what the platform is willing to claim
 * about a place it was never told. Every branch below that refuses is there
 * because storing something would have been worse than storing nothing: a
 * coordinate nobody supplied, attached to a stranger's listing, is not a
 * missing feature but a wrong answer.
 */

export interface BackfillCandidate {
  id: string;
  city: string | null;
  postalCode: string | null;
  countryCode: string;
}

export type BackfillSkipReason =
  /** The row names no town, so there is nothing to resolve. */
  | "no_address"
  /** The provider knew the query but returned no usable place. */
  | "unresolved"
  /** The provider answered outside the listing's own market. */
  | "wrong_market"
  /** The provider was unsure, and a guess is not an improvement on absence. */
  | "low_confidence"
  /** The answer was not a place on Earth. */
  | "invalid_coordinate";

export interface BackfillStore {
  action: "store";
  coordinate: GeoCoordinate;
  /**
   * Never finer than the town, whatever the provider claims.
   *
   * The query is built from a town and a postcode, so a finer answer is the
   * provider resolving something the platform did not ask about. Recording it
   * as `exact` would turn "somewhere in Nantes" into "this address in Nantes"
   * on the strength of data nobody entered.
   */
  precision: Extract<LocationPrecision, "city" | "postal_code">;
  normalizedAddress: string | null;
  administrativeArea: string | null;
  provider: string;
}

export interface BackfillSkip {
  action: "skip";
  reason: BackfillSkipReason;
}

export type BackfillDecision = BackfillStore | BackfillSkip;

/** What the provider is asked. A town and a postcode, never a private address. */
export function backfillQuery(candidate: BackfillCandidate): string | null {
  const parts = [candidate.postalCode, candidate.city]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export function decideBackfill(
  candidate: BackfillCandidate,
  results: readonly GeocodingResult[],
): BackfillDecision {
  if (!backfillQuery(candidate))
    return { action: "skip", reason: "no_address" };
  const best = results[0];
  if (!best) return { action: "skip", reason: "unresolved" };

  if (best.countryCode.toUpperCase() !== candidate.countryCode.toUpperCase()) {
    return { action: "skip", reason: "wrong_market" };
  }
  if (!isValidCoordinate(best.coordinate)) {
    return { action: "skip", reason: "invalid_coordinate" };
  }
  /*
   * A low-confidence hit on a town name is usually a different town with a
   * similar name, in the same country, at the wrong end of it. That is exactly
   * the failure a backfill must not commit at scale, because nothing downstream
   * can tell it apart from a good answer.
   */
  if (best.confidence === "low") {
    return { action: "skip", reason: "low_confidence" };
  }

  const askedForPostcode = Boolean(candidate.postalCode?.trim());
  return {
    action: "store",
    coordinate: best.coordinate,
    precision:
      askedForPostcode && best.precision === "postal_code"
        ? "postal_code"
        : "city",
    normalizedAddress: best.normalizedAddress ?? null,
    administrativeArea: best.administrativeArea ?? null,
    provider: best.provider,
  };
}

export interface BackfillReport {
  attempted: number;
  stored: number;
  skipped: Record<BackfillSkipReason, number>;
  failed: number;
}

export function emptyBackfillReport(): BackfillReport {
  return {
    attempted: 0,
    stored: 0,
    skipped: {
      no_address: 0,
      unresolved: 0,
      wrong_market: 0,
      low_confidence: 0,
      invalid_coordinate: 0,
    },
    failed: 0,
  };
}

export function recordDecision(
  report: BackfillReport,
  decision: BackfillDecision,
): BackfillReport {
  report.attempted += 1;
  if (decision.action === "store") report.stored += 1;
  else report.skipped[decision.reason] += 1;
  return report;
}

/**
 * Whether a bulk job may point at this endpoint.
 *
 * The interactive path is allowed to use the public OpenStreetMap instance in
 * local development — a developer typing an address is what its policy tolerates.
 * A backfill is the opposite of that by construction: it is the bulk use the
 * policy names and forbids, and it is the fastest way to have the platform
 * blocked. So this refuses in *every* environment, not only hosted ones.
 */
export function rejectsBulkGeocodingEndpoint(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.endsWith("nominatim.openstreetmap.org");
  } catch {
    return true;
  }
}
