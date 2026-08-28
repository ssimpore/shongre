import "server-only";
import { cache } from "react";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { listingRepository } from "../../repositories/listing.repository";
import { userRepository } from "../../repositories/user.repository";
import { DemoEmploymentService } from "../../api/adapters/demo/demo-employment.service";
import { DemoAutoService } from "../../api/adapters/demo/demo-auto.service";
import { DemoCoursesService } from "../../api/adapters/demo/demo-courses.service";
import { DemoRealEstateService } from "../../api/adapters/demo/demo-real-estate.service";
import { collectionService } from "../../domains/collection/collection.service";
import type { SearchFilters, UserProfile } from "../../types";
import { employmentSearchQuerySchema } from "@shongre/contracts/employment";
import type {
  PublicRouteDataResolution,
  SellerPublicRouteData,
} from "./public-route-data";
import { listingIsPublishedInMarket } from "./public-route-data";
import { COUNTRY_REGISTRY } from "@shongre/contracts";

const employmentService = new DemoEmploymentService();
const autoService = new DemoAutoService();
const coursesService = new DemoCoursesService();
const realEstateService = new DemoRealEstateService();

function decoded(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function publicSeller(seller: UserProfile | null): seller is UserProfile {
  return Boolean(
    seller && seller.status === "active" && seller.accountType !== "staff",
  );
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
    userRepository.getReviewsForUser(seller.id),
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
    const listing = id ? await listingRepository.getListingById(id) : null;
    if (!listing || !listingIsPublishedInMarket(listing, countryCode)) {
      return { status: "not_found", data: null, resourceType: "listing" };
    }
    const [seller, similarListings] = await Promise.all([
      userRepository.getUserById(listing.sellerId),
      listingRepository.getSimilarListings(listing.id, listing.categorySlug),
    ]);
    return {
      status: "found",
      data: {
        kind: "listing",
        listing,
        seller: publicSeller(seller) ? seller : null,
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
      const job = await employmentService.getJob(slug);
      if (job.marketCode !== countryCode || job.lifecycle !== "published") {
        return { status: "not_found", data: null, resourceType: "job" };
      }
      const [catalog, similarJobs] = await Promise.all([
        employmentService.getCatalog(countryCode),
        employmentService.getSimilarJobs(job.id),
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
      const vehicle = await autoService.getVehicle(slug);
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
      const property = await realEstateService.getProperty(slug);
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
      const result = await coursesService.getTutorProfile(slug);
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
      listingRepository.getListings(filters),
      Promise.all(
        COUNTRY_REGISTRY.filter(
          (country) =>
            country.enabled &&
            country.marketplace.enabled &&
            country.seo.indexable &&
            ["active", "beta"].includes(country.launchStatus),
        ).map(async (country) => ({
          countryCode: country.code,
          result: await listingRepository.getListings({
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
      listingRepository.getListings({
        marketCode: countryCode,
        limit: 1_000,
      }),
      Promise.all(
        COUNTRY_REGISTRY.filter(
          (country) =>
            country.enabled &&
            country.marketplace.enabled &&
            country.seo.indexable &&
            ["active", "beta"].includes(country.launchStatus),
        ).map(async (country) => {
          const candidateInventory = await listingRepository.getListings({
            marketCode: country.code,
            limit: 1_000,
          });
          return {
            countryCode: country.code,
            count: collectionService.filterListingsForCollection(
              collection,
              candidateInventory.listings,
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
  const inventory = await listingRepository.getListings({
    marketCode: countryCode,
    limit: 50_000,
  });
  const activeListings = inventory.listings.filter(
    (listing) =>
      listing.status === "active" &&
      listingIsPublishedInMarket(listing, countryCode),
  );
  const sellerIds = Array.from(
    new Set(activeListings.map((listing) => listing.sellerId)),
  );
  const sellers = (
    await Promise.all(
      sellerIds.map((sellerId) => userRepository.getUserById(sellerId)),
    )
  ).filter(publicSeller);

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
            employmentService.getJob(job.slug),
          ),
        ),
      ])
    : [null, []];

  const collections = collectionService.getCollections().map((collection) => ({
    collection,
    listings: collectionService.filterListingsForCollection(
      collection,
      activeListings,
    ),
  }));

  return { activeListings, sellers, jobs, employmentCatalog, collections };
}
