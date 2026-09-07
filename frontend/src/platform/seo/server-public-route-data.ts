import "server-only";
import { cache } from "react";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { listingRepository } from "../../repositories/listing.repository";
import { userRepository } from "../../repositories/user.repository";
import { createServiceRegistry } from "../../api/client/service-registry";
import { apiClientConfig } from "../../api/client/api-client.config";
import { collectionService } from "../../domains/collection/collection.service";
import type { Listing, SearchFilters, UserProfile } from "../../types";
import { employmentSearchQuerySchema } from "@shongre/contracts/employment";
import type {
  PublicRouteDataResolution,
  SellerPublicRouteData,
} from "./public-route-data";
import { listingIsPublishedInMarket } from "./public-route-data";
import { COUNTRY_REGISTRY } from "@shongre/contracts";
import { fetchPublicSitemapListingPage } from "../../api/adapters/http/http-sitemap.service";

const serverServices = createServiceRegistry(apiClientConfig.dataMode);
const listingsService = serverServices.listings;
const searchService = serverServices.search;
const employmentService = serverServices.employment;
const autoService = serverServices.auto;
const coursesService = serverServices.courses;
const realEstateService = serverServices.realEstate;
const PUBLIC_SEARCH_PAGE_LIMIT = 50;
const SITEMAP_API_PAGE_LIMIT = 500;
const SITEMAP_MAX_API_PAGES = 2_000;

interface ServerListingCollection {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
  totalRelation?: "exact" | "lower_bound";
  snapshotAt?: string;
  pageInfo?: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
}

async function getServerListings(
  filters: SearchFilters,
): Promise<ServerListingCollection> {
  if (!filters.marketCode) {
    throw new Error("Server listing discovery requires an explicit market.");
  }
  const result = await searchService.search({
    ...filters,
    marketCode: filters.marketCode,
    limit: Math.min(
      PUBLIC_SEARCH_PAGE_LIMIT,
      Math.max(1, filters.limit || PAGE_SIZES.marketplaceSearch),
    ),
  });
  const page = Math.max(1, filters.page || 1);
  return {
    listings: result.items,
    total: result.total,
    page,
    totalPages: result.totalPages,
    totalRelation: result.totalRelation,
    snapshotAt: result.snapshotAt,
    pageInfo: result.pageInfo,
  };
}

async function getServerListingWindow(
  filters: SearchFilters,
  maximumItems: number,
): Promise<ServerListingCollection> {
  const boundedMaximum = Math.max(1, Math.trunc(maximumItems));
  const listings: Listing[] = [];
  const seenListingIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let firstPage: ServerListingCollection | null = null;
  let lastPage: ServerListingCollection | null = null;

  do {
    const page = await getServerListings({
      ...filters,
      page: undefined,
      cursor,
      limit: Math.min(
        PUBLIC_SEARCH_PAGE_LIMIT,
        boundedMaximum - listings.length,
      ),
    });
    firstPage ??= page;
    lastPage = page;
    for (const listing of page.listings) {
      if (seenListingIds.has(listing.id)) continue;
      seenListingIds.add(listing.id);
      listings.push(listing);
      if (listings.length >= boundedMaximum) break;
    }
    const nextCursor = page.pageInfo?.nextCursor;
    if (!nextCursor || !page.pageInfo?.hasNextPage) break;
    if (seenCursors.has(nextCursor)) {
      throw new Error(
        "Public discovery returned a repeated pagination cursor.",
      );
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  } while (listings.length < boundedMaximum);

  const baseline = firstPage || {
    listings: [],
    total: 0,
    page: 1,
    totalPages: 1,
  };
  return {
    ...baseline,
    listings,
    pageInfo: lastPage?.pageInfo,
  };
}

async function getAllServerSitemapListings(
  countryCode: string,
): Promise<Listing[]> {
  const listings: Listing[] = [];
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (
    let pageNumber = 0;
    pageNumber < SITEMAP_MAX_API_PAGES;
    pageNumber += 1
  ) {
    const page = await fetchPublicSitemapListingPage({
      marketCode: countryCode,
      cursor,
      limit: SITEMAP_API_PAGE_LIMIT,
    });
    for (const listing of page.items) {
      if (seenIds.has(listing.id)) continue;
      seenIds.add(listing.id);
      listings.push(listing);
    }
    const nextCursor = page.pageInfo.nextCursor;
    if (!page.pageInfo.hasNextPage || !nextCursor) return listings;
    if (seenCursors.has(nextCursor)) {
      throw new Error(
        "Sitemap discovery returned a repeated pagination cursor.",
      );
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
  throw new Error(
    "Sitemap discovery exceeded its one-million-listing safety bound.",
  );
}

async function getServerListingById(
  id: string,
  countryCode: string,
): Promise<Listing | null> {
  const listings = await listingsService.getPublicListingsByIds(
    [id],
    countryCode,
  );
  return listings[0] || null;
}

async function getServerSimilarListings(
  listing: Listing,
  countryCode: string,
): Promise<Listing[]> {
  const result = await getServerListings({
    marketCode: countryCode,
    categorySlug: listing.subCategorySlug || listing.categorySlug,
    page: 1,
    limit: PAGE_SIZES.similarListings + 1,
  });
  return result.listings
    .filter((candidate) => candidate.id !== listing.id)
    .slice(0, PAGE_SIZES.similarListings);
}

function decoded(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function publicSeller(seller: UserProfile | null): seller is UserProfile {
  return Boolean(seller && seller.status === "active");
}

function sellerCountryCode(seller: UserProfile): string | null {
  const value = String(seller.country || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : null;
}

async function resolveSeller(
  slug: string,
  countryCode: string,
): Promise<PublicRouteDataResolution> {
  const seller = await userRepository.getUserBySlugOrId(slug);
  if (!publicSeller(seller)) {
    return { status: "not_found", data: null, resourceType: "seller" };
  }
  const [allListings, reviews] = await Promise.all([
    listingRepository.getListingsBySeller(seller.id),
    serverServices.reviews.getUserReviews(seller.id),
  ]);
  const listings = allListings.filter(
    (listing) =>
      listing.status === "active" &&
      listingIsPublishedInMarket(listing, countryCode),
  );
  const configuredCountry = sellerCountryCode(seller);
  if (
    configuredCountry &&
    configuredCountry !== countryCode &&
    listings.length === 0
  ) {
    return { status: "not_found", data: null, resourceType: "seller" };
  }
  const data: SellerPublicRouteData = {
    kind: "seller",
    seller,
    listings,
    reviews,
  };
  return { status: "found", data };
}

async function resolveUncached(
  pathname: string,
  countryCode: string,
  queryString: string,
): Promise<PublicRouteDataResolution> {
  const listingMatch = pathname.match(/^\/annonce\/([^/]+)$/);
  if (listingMatch) {
    const id = decoded(listingMatch[1]);
    const listing = id ? await getServerListingById(id, countryCode) : null;
    if (!listing || !listingIsPublishedInMarket(listing, countryCode)) {
      return { status: "not_found", data: null, resourceType: "listing" };
    }
    const similarListings = await getServerSimilarListings(
      listing,
      countryCode,
    );
    return {
      status: "found",
      data: {
        kind: "listing",
        listing,
        seller: listing.sellerProfile ?? null,
        similarListings: similarListings.filter((candidate) =>
          listingIsPublishedInMarket(candidate, countryCode),
        ),
      },
    };
  }

  const sellerMatch = pathname.match(
    /^\/(?:boutique|profil|vendeur|u)\/([^/]+)$/,
  );
  if (sellerMatch) {
    const slug = decoded(sellerMatch[1]);
    return slug
      ? resolveSeller(slug, countryCode)
      : { status: "not_found", data: null, resourceType: "seller" };
  }

  const jobMatch = pathname.match(/^\/emploi\/offre\/([^/]+)$/);
  if (jobMatch) {
    const slug = decoded(jobMatch[1]);
    if (!slug) {
      return { status: "not_found", data: null, resourceType: "job" };
    }
    try {
      const job = await employmentService.getJob(slug, countryCode);
      if (job.marketCode !== countryCode || job.lifecycle !== "published") {
        return { status: "not_found", data: null, resourceType: "job" };
      }
      const [catalog, similarJobs] = await Promise.all([
        employmentService.getCatalog(countryCode),
        employmentService.getSimilarJobs(job.id, countryCode),
      ]);
      return {
        status: "found",
        data: { kind: "job", job, catalog, similarJobs },
      };
    } catch {
      return { status: "not_found", data: null, resourceType: "job" };
    }
  }

  const vehicleMatch = pathname.match(/^\/auto\/vehicule\/([^/]+)$/);
  if (vehicleMatch) {
    const slug = decoded(vehicleMatch[1]);
    if (!slug) {
      return {
        status: "not_found",
        data: null,
        resourceType: "vertical_resource",
      };
    }
    try {
      const vehicle = await autoService.getVehicle(slug, countryCode);
      if (!vehicle.marketCodes.includes(countryCode)) {
        return {
          status: "not_found",
          data: null,
          resourceType: "vertical_resource",
        };
      }
      return {
        status: "found",
        data: {
          kind: "vertical_resource",
          vertical: "automotive",
          canonicalPath: `/auto/vehicule/${vehicle.slug}`,
        },
      };
    } catch {
      return {
        status: "not_found",
        data: null,
        resourceType: "vertical_resource",
      };
    }
  }

  const propertyMatch = pathname.match(/^\/immo\/bien\/([^/]+)$/);
  if (propertyMatch) {
    const slug = decoded(propertyMatch[1]);
    if (!slug) {
      return {
        status: "not_found",
        data: null,
        resourceType: "vertical_resource",
      };
    }
    try {
      const property = await realEstateService.getProperty(slug, countryCode);
      if (!property.marketCodes.includes(countryCode)) {
        return {
          status: "not_found",
          data: null,
          resourceType: "vertical_resource",
        };
      }
      return {
        status: "found",
        data: {
          kind: "vertical_resource",
          vertical: "real_estate",
          canonicalPath: `/immo/bien/${property.slug}`,
        },
      };
    } catch {
      return {
        status: "not_found",
        data: null,
        resourceType: "vertical_resource",
      };
    }
  }

  const tutorMatch = pathname.match(/^\/education\/professeur\/([^/]+)$/);
  if (tutorMatch) {
    const slug = decoded(tutorMatch[1]);
    if (!slug) {
      return {
        status: "not_found",
        data: null,
        resourceType: "vertical_resource",
      };
    }
    try {
      const result = await coursesService.getTutorProfile(slug, countryCode);
      const hasPublicOffer = result.offers.some(
        (offer) =>
          offer.status === "published" &&
          offer.marketCodes.includes(countryCode),
      );
      if (!hasPublicOffer) {
        return {
          status: "not_found",
          data: null,
          resourceType: "vertical_resource",
        };
      }
      return {
        status: "found",
        data: {
          kind: "vertical_resource",
          vertical: "education",
          canonicalPath: `/education/professeur/${result.tutor.slug}`,
        },
      };
    } catch {
      return {
        status: "not_found",
        data: null,
        resourceType: "vertical_resource",
      };
    }
  }

  if (pathname === "/emploi" && !queryString) {
    const query = employmentSearchQuerySchema.parse({
      marketCode: countryCode,
      sort: "relevance",
      limit: PAGE_SIZES.marketplaceSearch,
    });
    const [catalog, result] = await Promise.all([
      employmentService.getCatalog(countryCode),
      employmentService.searchJobs(query),
    ]);
    return {
      status: "found",
      data: {
        kind: "employment_search",
        catalog,
        items: result.items,
        total: result.total,
        recommendationFactors: result.recommendationFactors,
        availableCountryCodes: result.total > 0 ? [countryCode] : [],
      },
    };
  }

  const categoryMatch = pathname.match(/^\/categorie\/([^/]+)$/);
  if ((pathname === "/recherche" && !queryString) || categoryMatch) {
    const categorySlug = categoryMatch ? decoded(categoryMatch[1]) : null;
    if (categoryMatch && !categorySlug) {
      return {
        status: "not_found",
        data: null,
        resourceType: "listing_search",
      };
    }
    const filters: SearchFilters = {
      marketCode: countryCode,
      categorySlug: categorySlug || undefined,
      limit: PAGE_SIZES.marketplaceSearch,
      page: 1,
      sortBy: "date_desc",
    };
    const [result, marketInventory] = await Promise.all([
      getServerListings(filters),
      Promise.all(
        COUNTRY_REGISTRY.filter(
          (country) =>
            country.enabled &&
            country.marketplace.enabled &&
            country.seo.indexable &&
            ["active", "beta"].includes(country.launchStatus),
        ).map(async (country) => ({
          countryCode: country.code,
          result: await getServerListings({
            ...filters,
            marketCode: country.code,
            limit: 1,
          }),
        })),
      ),
    ]);
    return {
      status: "found",
      data: {
        kind: "listing_search",
        pathname,
        items: result.listings,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        totalRelation: result.totalRelation,
        snapshotAt: result.snapshotAt,
        pageInfo: result.pageInfo,
        availableCountryCodes: marketInventory
          .filter((entry) => entry.result.total > 0)
          .map((entry) => entry.countryCode),
      },
    };
  }

  const collectionMatch = pathname.match(/^\/collections\/([^/]+)$/);
  if (collectionMatch) {
    const slug = decoded(collectionMatch[1]);
    const collection = slug ? collectionService.getCollection(slug) : undefined;
    if (!collection) {
      return { status: "not_found", data: null, resourceType: "collection" };
    }
    const [inventory, marketCollections] = await Promise.all([
      getServerListingWindow(
        {
          marketCode: countryCode,
        },
        1_000,
      ),
      Promise.all(
        COUNTRY_REGISTRY.filter(
          (country) =>
            country.enabled &&
            country.marketplace.enabled &&
            country.seo.indexable &&
            ["active", "beta"].includes(country.launchStatus),
        ).map(async (country) => {
          const candidateInventory = await getServerListingWindow(
            {
              marketCode: country.code,
            },
            1_000,
          );
          return {
            countryCode: country.code,
            count: collectionService.filterListingsForCollection(
              collection,
              candidateInventory.listings,
              { marketCode: country.code },
            ).length,
          };
        }),
      ),
    ]);
    return {
      status: "found",
      data: {
        kind: "collection",
        collection,
        listings: collectionService.filterListingsForCollection(
          collection,
          inventory.listings,
          { marketCode: countryCode },
        ),
        availableCountryCodes: marketCollections
          .filter((entry) => entry.count > 0)
          .map((entry) => entry.countryCode),
      },
    };
  }

  return { status: "not_applicable", data: null };
}

export const resolveServerPublicRouteData = cache(resolveUncached);

export async function listServerPublicSitemapData(countryCode: string) {
  const inventory = await getAllServerSitemapListings(countryCode);
  const activeListings = inventory.filter(
    (listing) =>
      listing.status === "active" &&
      listingIsPublishedInMarket(listing, countryCode),
  );
  const sellerIds = Array.from(
    new Set(activeListings.map((listing) => listing.sellerId)),
  );
  const sellerIdSet = new Set(sellerIds);
  const sellers = (await userRepository.getAllUsers()).filter(
    (seller) => sellerIdSet.has(seller.id) && publicSeller(seller),
  );

  const employmentResult =
    countryCode === "FR"
      ? await employmentService.searchJobs(
          employmentSearchQuerySchema.parse({
            marketCode: countryCode,
            sort: "newest",
            limit: 100,
          }),
        )
      : null;
  const [employmentCatalog, jobs] = employmentResult
    ? await Promise.all([
        employmentService.getCatalog(countryCode),
        Promise.all(
          employmentResult.items.map((job) =>
            employmentService.getJob(job.slug, countryCode),
          ),
        ),
      ])
    : [null, []];

  const collections = collectionService.getCollections().map((collection) => ({
    collection,
    listings: collectionService.filterListingsForCollection(
      collection,
      activeListings,
      { marketCode: countryCode },
    ),
  }));

  return { activeListings, sellers, jobs, employmentCatalog, collections };
}
