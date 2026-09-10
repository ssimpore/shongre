import type {
  GeoBoundingBox,
  GeoCoordinate,
  GeocodingResult,
  LocationPrecision,
  LocationSource,
} from "@shongre/contracts/geospatial";

/**
 * The seams a provider plugs into.
 *
 * Nothing above these interfaces knows that tiles come from OpenFreeMap or that
 * an address is resolved by a Nominatim-compatible service. That is the point:
 * the licence terms, rate limits and availability of a free provider are not
 * business rules, and when one has to be replaced the replacement is an adapter
 * plus an environment value, not a search through feature code.
 */

export interface MapTileProvider {
  readonly id: string;
  /** A MapLibre style document URL. Renderers take a style, not a tile URL. */
  styleUrl(): string;
  /** Required by the licence, and therefore returned with the style, not next to it. */
  attribution(): string;
}

export interface GeocodingQuery {
  query: string;
  /** ISO-3166-1 alpha-2. Results outside it are discarded, not ranked down. */
  countryCode: string;
  /** BCP-47, for localized place names where the provider supports it. */
  locale?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface ReverseGeocodingQuery {
  coordinate: GeoCoordinate;
  countryCode?: string;
  locale?: string;
  signal?: AbortSignal;
}

export interface GeocodingProvider {
  readonly id: string;
  /** Written place to coordinates. Ordered best-first; may be empty. */
  forward(query: GeocodingQuery): Promise<GeocodingResult[]>;
}

export interface ReverseGeocodingProvider {
  readonly id: string;
  /** Coordinates to a written place, or null when the provider knows none. */
  reverse(query: ReverseGeocodingQuery): Promise<GeocodingResult | null>;
}

/** The stored, authoritative location of one subject. Server-side only. */
export interface StoredLocationRecord {
  subjectId: string;
  coordinate: GeoCoordinate | null;
  countryCode: string;
  administrativeArea: string | null;
  departmentOrRegion: string | null;
  city: string | null;
  postalCode: string | null;
  normalizedAddress: string | null;
  precision: LocationPrecision;
  source: LocationSource | null;
  geocodingProvider: string | null;
  geocodedAt: string | null;
  locationUpdatedAt: string | null;
}

export interface LocationUpsert {
  subjectId: string;
  coordinate: GeoCoordinate;
  countryCode: string;
  administrativeArea?: string | null;
  departmentOrRegion?: string | null;
  city?: string | null;
  postalCode?: string | null;
  normalizedAddress?: string | null;
  precision: LocationPrecision;
  source: LocationSource;
  geocodingProvider?: string | null;
}

/**
 * Reading and writing the authoritative point.
 *
 * Separate from the search service because backfill, publication and moderation
 * all write locations without searching, and search reads without writing.
 */
export interface LocationRepository {
  findBySubjectId(subjectId: string): Promise<StoredLocationRecord | null>;
  upsert(location: LocationUpsert): Promise<void>;
  /**
   * Subjects that still need a coordinate, oldest first, resumable through
   * `afterSubjectId`. Backfill uses this and must be able to stop and restart.
   */
  listMissingCoordinates(input: {
    marketCode?: string;
    limit: number;
    afterSubjectId?: string;
  }): Promise<StoredLocationRecord[]>;
}

export interface GeospatialSearchInput {
  marketCode: string;
  center?: GeoCoordinate;
  radiusKm?: number;
  boundingBox?: GeoBoundingBox;
  limit: number;
  /** Keyset cursor. Offsets get expensive exactly where maps get interesting. */
  cursor?: string;
  sort?: "distance" | "relevance";
}

export interface GeospatialSearchHit {
  subjectId: string;
  distanceKm: number | null;
}

export interface GeospatialSearchResult {
  hits: GeospatialSearchHit[];
  nextCursor: string | null;
  /** The viewport that contains every hit, for a client that wants to fit to it. */
  bounds: GeoBoundingBox | null;
}

/**
 * Spatial filtering, owned by the database.
 *
 * The implementation must push `ST_DWithin` and envelope intersection into
 * PostgreSQL against the GiST index. Filtering in application code reads the
 * whole table first, which is fine at seed scale and catastrophic at production
 * scale — and the difference does not show up until it is expensive.
 */
export interface GeospatialSearchService {
  search(input: GeospatialSearchInput): Promise<GeospatialSearchResult>;
}
