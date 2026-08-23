import type { AutoCatalog } from "../schemas/auto";
import type { CourseCatalog } from "../schemas/courses";
import type { MonetizationCatalog, MonetizationProduct } from "../schemas/monetization";
import type { RealEstateCatalog } from "../schemas/real-estate";
import type { EmploymentCatalog } from "../schemas/employment";

const AUTO_PRODUCTS: Record<string, string> = {
  auto_private_free: "auto.private.free",
  auto_private_secure: "auto.private.secure",
  auto_dealer_starter: "auto.dealer.starter",
  auto_dealer_growth: "auto.dealer.growth",
  auto_dealer_network: "auto.dealer.network",
};

const COURSE_PRODUCTS: Record<string, string> = {
  tutor_free: "course.tutor.free",
  tutor_pro: "course.tutor.pro",
  tutor_premium: "course.tutor.premium",
  school_organization: "course.school.organization",
};

const IMMO_PRODUCTS: Record<string, string> = {
  immo_owner_free: "immo.owner.free",
  immo_owner_visibility: "immo.owner.visibility",
  immo_agency_starter: "immo.agency.starter",
  immo_agency_growth: "immo.agency.growth",
  immo_agency_network: "immo.agency.network",
};

const active = (product: MonetizationProduct) => product.status === "active";
const entitlementObject = (product: MonetizationProduct) =>
  Object.fromEntries(product.entitlements.map((entry) => [entry.key, entry.value]));
const price = (product: MonetizationProduct, period: "once" | "month" | "year") =>
  product.prices.find((entry) => entry.billingPeriod === period);

/**
 * Keeps the established vertical response contracts while making every price,
 * duration, status, label and monetized entitlement a projection of the
 * published commercial catalog.
 */
export function applyMonetizationToAutoCatalog(
  source: AutoCatalog,
  commercial: MonetizationCatalog,
): AutoCatalog {
  return {
    ...source,
    plans: source.plans.map((plan) => {
      const product = commercial.products.find(
        (candidate) => candidate.id === AUTO_PRODUCTS[plan.id],
      );
      if (!product) return plan;
      const monthly = price(product, "month") || price(product, "once");
      const annual = price(product, "year");
      return {
        ...plan,
        name: product.name,
        description: product.description,
        monthlyPrice:
          monthly && monthly.amount.amountMinor > 0 ? monthly.amount : undefined,
        annualPrice: annual?.amount,
        durationDays: monthly?.durationDays,
        trialDays: monthly?.trialDays,
        taxRateBps: monthly?.taxRateBps || 0,
        isActive: active(product),
        isRecommended: product.recommended,
        entitlements: {
          ...plan.entitlements,
          ...entitlementObject(product),
        } as typeof plan.entitlements,
      };
    }),
    addOns: source.addOns.map((addOn) => {
      const product = commercial.products.find((candidate) => candidate.id === addOn.id);
      if (!product) return addOn;
      const activePrice = product.prices[0];
      return {
        ...addOn,
        name: product.name,
        description: product.description,
        price: activePrice.amount,
        taxRateBps: activePrice.taxRateBps,
        validityDays: activePrice.durationDays,
        isActive: active(product),
      };
    }),
  };
}

export function applyMonetizationToCourseCatalog(
  source: CourseCatalog,
  commercial: MonetizationCatalog,
): CourseCatalog {
  return {
    ...source,
    plans: source.plans.map((plan) => {
      const product = commercial.products.find(
        (candidate) => candidate.id === COURSE_PRODUCTS[plan.id],
      );
      if (!product) return plan;
      const monthly = price(product, "month") || price(product, "once");
      const annual = price(product, "year");
      return {
        ...plan,
        name: product.name,
        description: product.description,
        monthlyPrice:
          monthly && monthly.amount.amountMinor > 0 ? monthly.amount : undefined,
        annualPrice: annual?.amount,
        taxRateBps: monthly?.taxRateBps || 0,
        isActive: active(product),
        isRecommended: product.recommended,
        entitlements: {
          ...plan.entitlements,
          ...entitlementObject(product),
        } as typeof plan.entitlements,
      };
    }),
    addOns: source.addOns.map((addOn) => {
      const product = commercial.products.find((candidate) => candidate.id === addOn.id);
      if (!product) return addOn;
      const activePrice = product.prices[0];
      return {
        ...addOn,
        name: product.name,
        price: activePrice.amount,
        validityDays: activePrice.durationDays,
        isActive: active(product),
      };
    }),
  };
}

export function applyMonetizationToRealEstateCatalog(
  source: RealEstateCatalog,
  commercial: MonetizationCatalog,
): RealEstateCatalog {
  return {
    ...source,
    offers: source.offers.map((offer) => {
      const product = commercial.products.find(
        (candidate) => candidate.id === IMMO_PRODUCTS[offer.id],
      );
      if (!product) return offer;
      return {
        ...offer,
        name: product.name,
        description: product.description,
        prices: product.prices.map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          billingPeriod: entry.billingPeriod,
          durationDays: entry.durationDays,
          trialDays: entry.trialDays,
          taxRateBps: entry.taxRateBps,
          isActive: active(product),
        })),
        entitlements: {
          ...offer.entitlements,
          ...entitlementObject(product),
        },
        isActive: active(product),
        isRecommended: product.recommended,
      };
    }),
    addOns: source.addOns.map((addOn) => {
      const product = commercial.products.find((candidate) => candidate.id === addOn.id);
      if (!product) return addOn;
      const activePrice = product.prices[0];
      return {
        ...addOn,
        name: product.name,
        description: product.description,
        price: activePrice.amount,
        taxRateBps: activePrice.taxRateBps,
        validityDays: activePrice.durationDays,
        isActive: active(product),
      };
    }),
  };
}

export function applyMonetizationToEmploymentCatalog(
  source: EmploymentCatalog,
  commercial: MonetizationCatalog,
): EmploymentCatalog {
  return {
    ...source,
    offers: source.offers.map((offer) => {
      const product = commercial.products.find((candidate) => candidate.id === offer.id);
      if (!product) return offer;
      return {
        ...offer,
        name: product.name,
        description: product.description,
        prices: product.prices.map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          billingPeriod: entry.billingPeriod,
          durationDays: entry.durationDays,
          trialDays: entry.trialDays,
          taxRateBps: entry.taxRateBps,
          isActive: active(product),
        })),
        entitlements: { ...offer.entitlements, ...entitlementObject(product) },
        isActive: active(product),
        isRecommended: product.recommended,
      };
    }),
    addOns: source.addOns.map((addOn) => {
      const product = commercial.products.find((candidate) => candidate.id === addOn.id);
      if (!product) return addOn;
      const activePrice = product.prices[0];
      return {
        ...addOn,
        name: product.name,
        description: product.description,
        price: activePrice.amount,
        taxRateBps: activePrice.taxRateBps,
        validityDays: activePrice.durationDays,
        isActive: active(product),
      };
    }),
  };
}
