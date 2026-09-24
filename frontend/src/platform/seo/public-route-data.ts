import type { TaxonomyV1TreeResponse } from "@shongre/contracts/taxonomy";
import type {
  EmploymentCatalog,
  JobPostingCard,
  JobPostingDetail,
} from "@shongre/contracts/employment";
import type { Collection } from "../../domains/collection/collection.types";
import type { HomepageExperience } from "../../domains/homepage/homepage.types";
import type { Listing, PublicSellerProfile, ReviewItem } from "../../types";
import { DEFAULT_MARKET_CODE } from "../../configuration/market-baseline";

/**
 * The market-wide homepage, resolved on the server so the document carries
 * the hero and every section instead of a loading shell.
 *
 * `heroListings` is the rail's selection, not the fifty listings it selects
 * from; both are card projections. A reader with a saved city refetches the
 * experience for it after hydration, exactly as before.
 */
export interface HomepagePublicRouteData {
  kind: "homepage";
  experience: HomepageExperience;
  heroListings: Listing[];
}

interface ListingPublicRouteData {
  kind: "listing";
  listing: Listing;
  seller: PublicSellerProfile | null;
  similarListings: Listing[];
}

export interface SellerPublicRouteData {
  kind: "seller";
  seller: PublicSellerProfile;
  listings: Listing[];
  reviews: ReviewItem[];
  /** Continues the seller's shelf past the first page, when there is more. */
  listingsNextCursor?: string;
  /** The seller's published listings in this market, beyond the loaded page. */
  listingsTotal?: number;
}

interface JobPublicRouteData {
  kind: "job";
  job: JobPostingDetail;
  catalog: EmploymentCatalog;
  similarJobs: JobPostingCard[];
}

interface EmploymentSearchPublicRouteData {
  kind: "employment_search";
  catalog: EmploymentCatalog;
  items: JobPostingCard[];
  total: number;
  recommendationFactors: string[];
  availableCountryCodes: string[];
}

interface ListingSearchPublicRouteData {
  taxonomy?: TaxonomyV1TreeResponse;
  kind: "listing_search";
  pathname: string;
  items: Listing[];
  total: number;
  page: number;
  totalPages: number;
  totalRelation?: "exact" | "lower_bound";
  snapshotAt?: string;
  pageInfo?: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
  availableCountryCodes: string[];
}

interface CollectionPublicRouteData {
  kind: "collection";
  collection: Collection;
  listings: Listing[];
  availableCountryCodes: string[];
}

interface ValidatedVerticalPublicRouteData {
  kind: "vertical_resource";
  vertical: "automotive" | "real_estate" | "education";
  canonicalPath: string;
}

export type PublicRouteData =
  | HomepagePublicRouteData
  | ListingPublicRouteData
  | SellerPublicRouteData
  | JobPublicRouteData
  | EmploymentSearchPublicRouteData
  | ListingSearchPublicRouteData
  | CollectionPublicRouteData
  | ValidatedVerticalPublicRouteData;

export type PublicRouteDataResolution =
  | { status: "not_applicable"; data: null }
  | { status: "found"; data: PublicRouteData }
  | {
      status: "not_found";
      data: null;
      resourceType: PublicRouteData["kind"];
    }
  /**
   * The lookup failed; whether the resource exists is unknown. Distinct from
   * `not_found` because answering 404 to a transient backend failure asks
   * crawlers to drop live inventory. Callers respond 503 and stay noindex.
   */
  | {
      status: "unavailable";
      data: null;
      resourceType: PublicRouteData["kind"];
    };

/**
 * A failed lookup is not an absent resource. Only an explicit `NOT_FOUND` from
 * the API proves the entity is gone; a rate limit, timeout or transport failure
 * leaves existence unknown, and answering 404 to those asks crawlers to drop
 * live inventory that is still published.
 */
export function resolutionForError(
  error: unknown,
  resourceType: PublicRouteData["kind"],
): PublicRouteDataResolution {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return code === "NOT_FOUND"
    ? { status: "not_found", data: null, resourceType }
    : { status: "unavailable", data: null, resourceType };
}

export function listingMarketCodes(listing: Listing): string[] {
  const primary = (listing.marketCode || DEFAULT_MARKET_CODE).toUpperCase();
  const configured = listing.marketCodes?.length
    ? listing.marketCodes
    : [primary];
  return Array.from(
    new Set(configured.map((countryCode) => countryCode.toUpperCase())),
  );
}

export function listingIsPublishedInMarket(
  listing: Listing,
  countryCode: string,
): boolean {
  const code = countryCode.toUpperCase();
  if (listing.marketPublications?.length) {
    return listing.marketPublications.some(
      (publication) =>
        publication.marketCode.toUpperCase() === code &&
        publication.status === "active",
    );
  }
  return listingMarketCodes(listing).includes(code);
}
