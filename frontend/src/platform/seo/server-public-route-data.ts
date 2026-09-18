import "server-only";
import { cache } from "react";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { createServiceRegistry } from "../../api/client/service-registry";
import { collectionService } from "../../domains/collection/collection.service";
import type { Listing, PublicSellerProfile, SearchFilters } from "../../types";
import { employmentSearchQuerySchema } from "@shongre/contracts/employment";
import type {
  HomepagePublicRouteData,
  PublicRouteData,
  PublicRouteDataResolution,
  SellerPublicRouteData,
} from "./public-route-data";
import {
  listingIsPublishedInMarket,
  resolutionForError,
} from "./public-route-data";
import { COUNTRY_REGISTRY } from "@shongre/contracts";
import { projectTaxonomyForRoute } from "../../domains/taxonomy/taxonomy.seo";
import { projectListingForSearchCard } from "../../domains/listing/listing-search-card.projection";
import { projectHomepageExperienceForDocument } from "../../domains/homepage/homepage-document.projection";
import { selectHeroListings } from "../../features/home/hero-selection";
import { fetchPublicSitemapListingPage } from "../../api/adapters/http/http-sitemap.service";

const serverServices = createServiceRegistry();
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

function sellerCountryCode(seller: PublicSellerProfile): string | null {
  const value = String(seller.country || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : null;
}

async function resolveSeller(
  slug: string,
  countryCode: string,
): Promise<PublicRouteDataResolution> {
  const seller = await serverServices.users.getPublicProfile(slug);
  if (!seller) {
    return { status: "not_found", data: null, resourceType: "seller" };
  }
  const [listingResult, reviews] = await Promise.all([
    serverServices.listings.getListings({ marketCode: countryCode }),
    serverServices.reviews.getUserReviews(seller.id),
  ]);
  const listings = listingResult.listings.filter(
    (listing) =>
      listing.sellerId === seller.id &&
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
    } catch (error) {
      return resolutionForError(error, "job");
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
    } catch (error) {
      return resolutionForError(error, "vertical_resource");
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
    } catch (error) {
      return resolutionForError(error, "vertical_resource");
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
    } catch (error) {
      return resolutionForError(error, "vertical_resource");
    }
  }

  if (pathname === "/" && !queryString) {
    /*
     * The composition is market-wide here: the document cannot know the
     * reader's saved city, and the market-wide answer is the one the page
     * paints first for everyone. The hero rail runs the same selection it
     * runs in the browser, so only its eight cards travel.
     */
    const locale = COUNTRY_REGISTRY.find(
      (country) => country.code === countryCode,
    )!.defaultLocale;
    const [experience, heroInventory] = await Promise.all([
      serverServices.homepage.getHomepage({
        marketCode: countryCode,
        locale,
        country: countryCode,
      }),
      listingsService.getListings({
        marketCode: countryCode,
        limit: PAGE_SIZES.homepagePromotedListings,
      }),
    ]);
    const data: HomepagePublicRouteData = {
      kind: "homepage",
      experience: projectHomepageExperienceForDocument(experience),
      heroListings: selectHeroListings(
        heroInventory.listings,
        locale,
        countryCode,
      ).map(projectListingForSearchCard),
    };
    return { status: "found", data };
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
    const [result, marketInventory, taxonomy] = await Promise.all([
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
      serverServices.taxonomy.getV1Tree({
        marketContext: { countryCode },
        locale: COUNTRY_REGISTRY.find(
          (country) => country.code === countryCode,
        )!.defaultLocale,
      }),
    ]);
    return {
      status: "found",
      data: {
        kind: "listing_search",
        // Only the route's own node is serialised into the document. The full
        // snapshot was 79% of the search page's HTML and its sole consumer is a
        // single-node SEO lookup; the client refetches the tree it renders from.
        taxonomy: projectTaxonomyForRoute(taxonomy, categorySlug),
        pathname,
        // The same idea for the rows: the initial page carries card fields,
        // not the detail projection, so 26 results do not cost 30% of the
        // document.
        items: result.listings.map(projectListingForSearchCard),
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
    const resolution = slug
      ? await collectionService.getCollection(
          slug,
          { countryCode },
          "fr-FR",
          PAGE_SIZES.collectionListings,
        )
      : null;
    if (!resolution) {
      return { status: "not_found", data: null, resourceType: "collection" };
    }
    const marketCollections = await Promise.all(
      COUNTRY_REGISTRY.filter(
        (country) =>
          country.enabled &&
          country.marketplace.enabled &&
          country.seo.indexable &&
          ["active", "beta"].includes(country.launchStatus),
      ).map(async (country) => ({
        countryCode: country.code,
        resolution: await collectionService.getCollection(
          slug!,
          { countryCode: country.code },
          "fr-FR",
          1,
        ),
      })),
    );
    return {
      status: "found",
      data: {
        kind: "collection",
        collection: resolution.collection,
        listings: resolution.listings,
        availableCountryCodes: marketCollections
          .filter((entry) => entry.resolution !== null)
          .map((entry) => entry.countryCode),
      },
    };
  }

  return { status: "not_applicable", data: null };
}

/** Route families, so an escaping failure still reports what was being resolved. */
const RESOURCE_TYPE_BY_PATH: ReadonlyArray<[RegExp, PublicRouteData["kind"]]> =
  [
    [/^\/$/, "homepage"],
    [/^\/annonce\//, "listing"],
    [/^\/(?:boutique|profil|vendeur|u)\//, "seller"],
    [/^\/emploi\/offre\//, "job"],
    [
      /^\/(?:auto\/vehicule|immo\/bien|education\/professeur)\//,
      "vertical_resource",
    ],
    [/^\/collections\//, "collection"],
  ];

function resourceTypeForPath(pathname: string): PublicRouteData["kind"] {
  return (
    RESOURCE_TYPE_BY_PATH.find(([pattern]) => pattern.test(pathname))?.[1] ??
    "listing_search"
  );
}

/**
 * The last boundary before Next renders. Without it an upstream failure escapes
 * the server component and Next answers 500 on a public page — the resolvers
 * below own the difference between an absent resource and a failed lookup, and
 * anything that still escapes is a failed lookup.
 */
async function resolveGuarded(
  pathname: string,
  countryCode: string,
  queryString: string,
): Promise<PublicRouteDataResolution> {
  try {
    return await resolveUncached(pathname, countryCode, queryString);
  } catch (error) {
    return resolutionForError(error, resourceTypeForPath(pathname));
  }
}

export const resolveServerPublicRouteData = cache(resolveGuarded);

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
  const sellers = (
    await Promise.all(
      sellerIds.map((sellerId) =>
        serverServices.users.getPublicProfile(sellerId),
      ),
    )
  ).filter((seller): seller is PublicSellerProfile => seller !== null);

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

  const collections = (
    await collectionService.getCollections({ countryCode }, "fr-FR")
  ).map((collection) => ({
    collection,
    listings: activeListings.filter(
      (listing) => listing.categorySlug === collection.slug,
    ),
  }));

  const taxonomy = await serverServices.taxonomy.getV1Tree({
    marketContext: { countryCode },
    locale: COUNTRY_REGISTRY.find((country) => country.code === countryCode)!
      .defaultLocale,
  });
  return {
    activeListings,
    sellers,
    jobs,
    employmentCatalog,
    collections,
    taxonomy,
  };
}
