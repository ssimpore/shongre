import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import {
  hasCommercialEntitlementValue,
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "@shongre/contracts/monetization";

export interface ProPlan {
  id: "free" | "pro_starter" | "pro_business" | "pro_enterprise";
  productId: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPriceMonthlyEquivalent: number;
  maxActiveListings: number;
  photosPerListing: number;
  storefrontCustomization: boolean;
  prioritySupport: boolean;
  analyticsLevel: "basic" | "standard" | "advanced" | "enterprise";
  verifiedBadge: boolean;
  automaticRelisting: boolean;
  bulkImportExport: boolean;
  isPopular?: boolean;
  features: string[];
}

const LEGACY_PLAN_IDS: Record<string, ProPlan["id"]> = {
  "plan.pro.free": "free",
  "plan.pro.business": "pro_business",
};

const entitlement = (
  product: (typeof BASELINE_MONETIZATION_CATALOG.products)[number],
  key: string,
) =>
  product.entitlements.find(
    (entry) => entry.key === key && isCommercialEntitlementOperational(entry),
  )?.value;

/**
 * Compatibility presentation derived from the canonical demo catalog. It
 * contains no independent prices or quotas and can be removed when the last
 * synchronous entitlement consumer has migrated to BusinessRulesService.
 */
export const PRO_PLANS: ProPlan[] = BASELINE_MONETIZATION_CATALOG.products
  .filter(
    (product) => product.status === "active" && product.id in LEGACY_PLAN_IDS,
  )
  .map((product) => {
    const monthly =
      product.prices.find((price) => price.billingPeriod === "month") ||
      product.prices[0];
    const annual = product.prices.find(
      (price) => price.billingPeriod === "year",
    );
    const maxListings = entitlement(product, "maxActiveListings");
    const maxPhotos = entitlement(product, "maxPhotosPerListing");
    const analytics = entitlement(product, "analyticsLevel");
    return {
      id: LEGACY_PLAN_IDS[product.id],
      productId: product.id,
      name: product.name,
      tagline: product.description,
      monthlyPrice: monthly.amount.amountMinor / 100,
      annualPriceMonthlyEquivalent: annual
        ? annual.amount.amountMinor / 1200
        : 0,
      maxActiveListings: typeof maxListings === "number" ? maxListings : 0,
      photosPerListing: typeof maxPhotos === "number" ? maxPhotos : 0,
      storefrontCustomization: Boolean(entitlement(product, "storeEnabled")),
      prioritySupport: Boolean(entitlement(product, "prioritySupport")),
      analyticsLevel:
        analytics === "standard" ||
        analytics === "advanced" ||
        analytics === "enterprise"
          ? analytics
          : "basic",
      verifiedBadge: Boolean(entitlement(product, "verifiedBadge")),
      automaticRelisting: Boolean(entitlement(product, "automaticRelisting")),
      bulkImportExport: Boolean(entitlement(product, "bulkPublish")),
      isPopular: product.recommended,
      features: product.entitlements
        .filter(
          (entry) =>
            isCommercialEntitlementOperational(entry) &&
            hasCommercialEntitlementValue(entry.value),
        )
        .map((entry) => `${entry.label} : ${String(entry.value)}`),
    };
  });

export interface ListingBoostOption {
  id: "urgent" | "highlight" | "top_of_list" | "gallery_boost" | "spotlight";
  productId: string;
  name: string;
  description: string;
  durationDays: number;
  priceEur: number;
  badgeLabel: string;
  multiplierEstimate: string;
}

const LEGACY_BOOST_IDS: Record<string, ListingBoostOption["id"]> = {
  "premium.urgent": "urgent",
  "premium.search_bump": "top_of_list",
  "premium.highlight": "spotlight",
  "premium.spotlight": "highlight",
  "premium.visibility_bundle": "gallery_boost",
};

export const LISTING_BOOSTS: ListingBoostOption[] =
  BASELINE_MONETIZATION_CATALOG.products
    .filter(
      (product) =>
        product.id in LEGACY_BOOST_IDS &&
        isCommercialProductPurchasable(product),
    )
    .map((product) => {
      const price = product.prices[0];
      return {
        id: LEGACY_BOOST_IDS[product.id],
        productId: product.id,
        name: product.name,
        description: product.description,
        durationDays: price.durationDays || 1,
        priceEur: price.amount.amountMinor / 100,
        badgeLabel: product.name,
        multiplierEstimate: "Visibilité payante",
      };
    });
