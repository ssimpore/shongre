import "server-only";
import type { MarketContext } from "@shongre/contracts";
import { taxonomySlugsForListing } from "../../domains/taxonomy/taxonomy.seo";
import type { PublicRouteDataResolution } from "./public-route-data";
import { listServerPublicSitemapData } from "./server-public-route-data";
import {
  listStaticSitemapPaths,
  resolveSeoPolicy,
  type SeoRoutePolicy,
} from "./seo-policy";
import type { SitemapEntry, SitemapGroup } from "./sitemap-xml";

function latestDate(values: Array<string | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .filter((value) => Number.isFinite(new Date(value).getTime()))
    .sort()
    .at(-1);
}

function listingLastModified(listing: {
  materiallyUpdatedAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}) {
  return (
    listing.materiallyUpdatedAt || listing.updatedAt || listing.publishedAt
  );
}

function listingImageUrls(
  listing: {
    coverImageUrl?: string;
    photos: Array<{ url: string }>;
  },
  canonicalUrl: string,
): string[] {
  const origin = new URL(canonicalUrl).origin;
  return Array.from(
    new Set(
      [
        listing.coverImageUrl,
        ...listing.photos.map((photo) => photo.url),
      ].flatMap((value) => {
        if (!value) return [];
        try {
          const url = new URL(value, origin);
          if (
            (url.protocol !== "http:" && url.protocol !== "https:") ||
            url.username ||
            url.password
          ) {
            return [];
          }
          return [url.toString()];
        } catch {
          return [];
        }
      }),
    ),
  );
}

function entryFromPolicy(
  policy: SeoRoutePolicy,
  context: MarketContext,
  lastModified = policy.lastModified,
): SitemapEntry | null {
  if (!policy.sitemapEligible || !policy.indexable) return null;
  const expectedHost = new URL(context.canonicalUrl).host;
  const url = new URL(policy.canonicalUrl);
  if (url.host !== expectedHost) {
    throw new Error(
      `Sitemap URL host ${url.host} does not match request market host ${expectedHost}.`,
    );
  }
  return { url: url.toString(), lastModified };
}

function resolveEntry(
  context: MarketContext,
  pathname: string,
  routeData: PublicRouteDataResolution = {
    status: "not_applicable",
    data: null,
  },
  lastModified?: string,
) {
  return entryFromPolicy(
    resolveSeoPolicy({ pathname, marketContext: context, routeData }),
    context,
    lastModified,
  );
}

function uniqueEntries(entries: Array<SitemapEntry | null>): SitemapEntry[] {
  return Array.from(
    new Map(
      entries
        .filter((entry): entry is SitemapEntry => Boolean(entry))
        .map((entry) => [entry.url, entry]),
    ).values(),
  ).sort((left, right) => left.url.localeCompare(right.url));
}

export async function buildMarketSitemapGroups(
  context: MarketContext,
): Promise<SitemapGroup[]> {
  if (context.kind !== "market" || !context.countryCode) return [];
  const countryCode = context.countryCode;
  const {
    activeListings,
    sellers,
    jobs,
    employmentCatalog,
    collections,
    taxonomy,
  } = await listServerPublicSitemapData(countryCode);
  const inventoryLastModified = latestDate(
    activeListings.map(listingLastModified),
  );

  const staticEntries = listStaticSitemapPaths().map((pathname) =>
    resolveEntry(context, pathname),
  );
  staticEntries.push(
    resolveEntry(
      context,
      "/recherche",
      {
        status: "found",
        data: {
          kind: "listing_search",
          taxonomy,
          pathname: "/recherche",
          items: activeListings,
          total: activeListings.length,
          page: 1,
          totalPages: activeListings.length ? 1 : 0,
          availableCountryCodes: activeListings.length ? [countryCode] : [],
        },
      },
      inventoryLastModified,
    ),
  );
  if (employmentCatalog) {
    staticEntries.push(
      resolveEntry(
        context,
        "/emploi",
        {
          status: "found",
          data: {
            kind: "employment_search",
            catalog: employmentCatalog,
            items: jobs,
            total: jobs.length,
            recommendationFactors: [],
            availableCountryCodes: jobs.length ? [countryCode] : [],
          },
        },
        latestDate(jobs.map((job) => job.publishedAt)),
      ),
    );
  }

  const categoryEntries = Array.from(
    new Set(activeListings.flatMap(taxonomySlugsForListing)),
  ).map((slug) => {
    const listings = activeListings.filter((listing) =>
      taxonomySlugsForListing(listing).includes(slug),
    );
    return resolveEntry(
      context,
      `/categorie/${encodeURIComponent(slug)}`,
      {
        status: "found",
        data: {
          kind: "listing_search",
          taxonomy,
          pathname: `/categorie/${slug}`,
          items: listings,
          total: listings.length,
          page: 1,
          totalPages: listings.length ? 1 : 0,
          availableCountryCodes: listings.length ? [countryCode] : [],
        },
      },
      latestDate(listings.map(listingLastModified)),
    );
  });

  const listingEntries = activeListings.map((listing) => {
    const entry = resolveEntry(
      context,
      `/annonce/${encodeURIComponent(listing.id)}`,
      {
        status: "found",
        data: {
          kind: "listing",
          listing,
          seller: null,
          similarListings: [],
        },
      },
      listingLastModified(listing),
    );
    return entry
      ? {
          ...entry,
          imageUrls: listingImageUrls(listing, entry.url),
        }
      : null;
  });

  const professionalEntries = sellers.map((seller) => {
    const listings = activeListings.filter(
      (listing) => listing.sellerId === seller.id,
    );
    const professional =
      seller.sellerType === "pro" || seller.accountType === "professional";
    return resolveEntry(
      context,
      `/${professional ? "boutique" : "profil"}/${encodeURIComponent(
        (professional && seller.storeSlug) || seller.slug || seller.id,
      )}`,
      {
        status: "found",
        data: {
          kind: "seller",
          seller,
          listings,
          reviews: [],
        },
      },
      latestDate(listings.map(listingLastModified)),
    );
  });

  const collectionEntries = collections.map(({ collection, listings }) =>
    resolveEntry(
      context,
      `/collections/${encodeURIComponent(collection.slug)}`,
      {
        status: "found",
        data: {
          kind: "collection",
          collection,
          listings,
          availableCountryCodes: listings.length ? [countryCode] : [],
        },
      },
      latestDate(listings.map(listingLastModified)),
    ),
  );

  const jobEntries = employmentCatalog
    ? jobs.map((job) =>
        resolveEntry(
          context,
          `/emploi/offre/${encodeURIComponent(job.slug)}`,
          {
            status: "found",
            data: {
              kind: "job",
              job,
              catalog: employmentCatalog,
              similarJobs: [],
            },
          },
          job.publishedAt,
        ),
      )
    : [];

  return [
    { id: "static", entries: uniqueEntries(staticEntries) },
    { id: "categories", entries: uniqueEntries(categoryEntries) },
    { id: "collections", entries: uniqueEntries(collectionEntries) },
    { id: "professionals", entries: uniqueEntries(professionalEntries) },
    { id: "listings", entries: uniqueEntries(listingEntries) },
    { id: "jobs", entries: uniqueEntries(jobEntries) },
  ].filter((group) => group.entries.length > 0);
}
