import type {
  EmploymentCatalog,
  JobPostingCard,
  JobPostingDetail,
} from "@shongre/contracts/employment";
import type { Collection } from "../../domains/collection/collection.types";
import type { Listing, PublicSellerProfile, ReviewItem } from "../../types";
import { DEFAULT_MARKET_CODE } from "../../configuration/market-baseline";

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
    };

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
