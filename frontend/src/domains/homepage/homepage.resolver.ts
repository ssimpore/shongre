import type {
  HomepageOfferOverride,
  HomepageSectionSettings,
  ResolvedHomepageSection,
  ResolvedHomepageConfiguration,
} from "@shongre/contracts/homepage";
import { isTaxonomyV4DescendantOf } from "@shongre/contracts/taxonomy-v4-identity";
import type { Listing } from "../../types";
import type {
  HomepageDealItem,
  HomepageExperience,
  HomepageQuery,
  HomepageSectionView,
  HomepageUniverseGroup,
} from "./homepage.types";
import type { TrendingSectionResponse } from "../trending/trending.types";
import { majorToMinorAmount } from "@shongre/shared/money";
import { DEFAULT_MARKET_CURRENCY } from "../../configuration/market-baseline";

const isOverrideActive = (override: HomepageOfferOverride, now: Date) =>
  (!override.startsAt ||
    new Date(override.startsAt).getTime() <= now.getTime()) &&
  (!override.endsAt || new Date(override.endsAt).getTime() > now.getTime());

function listingBelongsToMarket(listing: Listing, marketCode: string): boolean {
  const normalized = marketCode.toUpperCase();
  const publication = listing.marketPublications?.find(
    (candidate) => candidate.marketCode.toUpperCase() === normalized,
  );
  if (publication) return publication.status === "active";
  return (
    listing.marketCode?.toUpperCase() === normalized ||
    listing.marketCodes?.some((code) => code.toUpperCase() === normalized) ===
      true
  );
}

export function selectHomepageUniverseGroups(
  listings: Listing[],
  section: ResolvedHomepageSection,
  marketCode: string,
  includeSuppressed = false,
): HomepageUniverseGroup[] {
  const eligible = listings.filter(
    (listing) =>
      listing.status === "active" &&
      listingBelongsToMarket(listing, marketCode),
  );
  const groups = (section.settings.universeSubsections || [])
    .filter(
      (subsection) =>
        subsection.enabled && subsection.marketCodes.includes(marketCode),
    )
    .sort((left, right) => left.order - right.order)
    .slice(0, section.maxItems)
    .map((subsection): HomepageUniverseGroup => {
      const matching = eligible.filter((listing) =>
        isTaxonomyV4DescendantOf(
          listing.subCategorySlug || listing.categorySlug,
          subsection.categoryId,
        ),
      );
      const suppressed = matching.length < subsection.minimumListingCount;
      return {
        ...subsection,
        status: matching.length ? "ready" : "empty",
        eligibleListingCount: matching.length,
        suppressed,
        listings: suppressed ? [] : matching.slice(0, subsection.maxItems),
      };
    });
  return includeSuppressed
    ? groups
    : groups.filter((group) => !group.suppressed);
}

export function selectHomepageDeals(
  listings: Listing[],
  marketCode: string,
  settings: HomepageSectionSettings,
  limit: number,
  now = new Date(),
): HomepageDealItem[] {
  const normalizedMarket = marketCode.toUpperCase();
  const selectionMode = settings.selectionMode ?? "hybrid";
  if (
    settings.allowedMarkets?.length &&
    !settings.allowedMarkets.includes(normalizedMarket)
  ) {
    return [];
  }
  const activeOverrides = new Map(
    (settings.offerOverrides ?? [])
      .filter((override) => isOverrideActive(override, now))
      .map((override) => [override.listingId, override]),
  );

  return listings
    .flatMap((listing): HomepageDealItem[] => {
      const override = activeOverrides.get(listing.id);
      if (
        (selectionMode === "manual" && !override) ||
        (selectionMode !== "automatic" && override?.isHidden) ||
        listing.status !== "active" ||
        !listingBelongsToMarket(listing, normalizedMarket) ||
        (!settings.includeProfessionalSellers &&
          listing.sellerType === "pro") ||
        (settings.taxonomyBranches?.length &&
          !settings.taxonomyBranches.some(
            (branch) =>
              listing.categorySlug === branch ||
              listing.subCategorySlug === branch ||
              listing.subCategorySlug.startsWith(`${branch}.`),
          )) ||
        !listing.originalPrice
      ) {
        return [];
      }
      const currency = listing.currency ?? DEFAULT_MARKET_CURRENCY;
      const currentMinor = majorToMinorAmount(listing.price, currency);
      const originalMinor = majorToMinorAmount(listing.originalPrice, currency);
      if (currentMinor < 0 || originalMinor <= currentMinor) return [];
      if (
        listing.promotionState &&
        !["active", "inactive"].includes(listing.promotionState)
      ) {
        return [];
      }
      if (
        listing.promotionStartAt &&
        new Date(listing.promotionStartAt).getTime() > now.getTime()
      ) {
        return [];
      }
      if (
        listing.promotionEndAt &&
        new Date(listing.promotionEndAt).getTime() <= now.getTime()
      ) {
        return [];
      }
      const discountAmount = originalMinor - currentMinor;
      const discountBps = Math.floor((discountAmount * 10_000) / originalMinor);
      if (discountBps < (settings.minimumDiscountBps ?? 0)) return [];
      const type =
        listing.sellerType === "pro" &&
        settings.eligibleOfferTypes?.includes("professional_discount")
          ? "professional_discount"
          : "verified_price_reduction";
      if (
        settings.eligibleOfferTypes?.length &&
        !settings.eligibleOfferTypes.includes(type)
      ) {
        return [];
      }
      return [
        {
          listing,
          offer: {
            type,
            state: "active",
            currentPrice: { amountMinor: currentMinor, currency },
            originalPrice: { amountMinor: originalMinor, currency },
            discountAmount: { amountMinor: discountAmount, currency },
            discountBps,
            startsAt: listing.promotionStartAt,
            endsAt: listing.promotionEndAt,
          },
        },
      ];
    })
    .sort((left, right) => {
      if (selectionMode !== "automatic") {
        const leftOverride = activeOverrides.get(left.listing.id);
        const rightOverride = activeOverrides.get(right.listing.id);
        const pinDelta =
          Number(Boolean(rightOverride?.isPinned)) -
          Number(Boolean(leftOverride?.isPinned));
        if (pinDelta !== 0) return pinDelta;
        const orderDelta =
          (leftOverride?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (rightOverride?.sortOrder ?? Number.MAX_SAFE_INTEGER);
        if (orderDelta !== 0) return orderDelta;
      }
      return (
        right.offer.discountBps - left.offer.discountBps ||
        new Date(right.listing.updatedAt).getTime() -
          new Date(left.listing.updatedAt).getTime() ||
        left.listing.id.localeCompare(right.listing.id)
      );
    })
    .slice(0, limit);
}

export function sanitizeTrendingForMarket(
  response: TrendingSectionResponse,
  query: HomepageQuery,
  listingsPerTopic: number,
): TrendingSectionResponse {
  return {
    ...response,
    topics: response.topics.flatMap((topic) => {
      const listings = topic.listings
        .filter((listing) => listingBelongsToMarket(listing, query.marketCode))
        .slice(0, listingsPerTopic);
      return listings.length ? [{ ...topic, listings }] : [];
    }),
  };
}

export function toHomepageExperience(
  configuration: ResolvedHomepageConfiguration,
  content: ReadonlyMap<string, Partial<HomepageSectionView>>,
): HomepageExperience {
  return {
    ...configuration,
    sections: configuration.sections.map((section) => ({
      ...section,
      status: "ready" as const,
      ...content.get(section.key),
    })),
  };
}
