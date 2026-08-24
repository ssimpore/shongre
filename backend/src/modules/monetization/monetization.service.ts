import type { MonetizationOrder } from "@shongre/contracts/monetization";
import {
  hasCommercialEntitlementValue,
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "@shongre/contracts/monetization";
import { AppError } from "../../shared/errors/app-error.js";
import {
  businessRulesService,
  BusinessRulesService,
} from "../business-rules/business-rules.service.js";
import {
  repositories,
  type IListingRepository,
} from "../../infrastructure/database/repositories/index.js";
import {
  publisherEntitlementsService,
  type PublisherEntitlementsService,
} from "../publishers/publisher-entitlements.service.js";

export interface ListingBoostOption {
  id: string;
  name: string;
  type: "urgent" | "search_bump" | "featured";
  durationDays: number;
  price: number;
  currency: string;
  description: string;
  badgeLabel?: string;
}

export interface ProPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  maxListings: number;
  highlighted?: boolean;
}

const BOOST_TYPE: Record<string, ListingBoostOption["type"]> = {
  "premium.urgent": "urgent",
  "premium.search_bump": "search_bump",
  "premium.highlight": "featured",
  "premium.spotlight": "featured",
};
const PUBLIC_BOOST_IDS: Record<string, string> = {
  "premium.urgent": "urgent",
  "premium.search_bump": "top_of_list",
  "premium.spotlight": "highlight",
  "premium.highlight": "spotlight",
};
const LEGACY_PLAN_IDS: Record<string, string> = {
  "plan.pro.free": "free",
  "plan.pro.starter": "starter",
  "plan.pro.business": "pro",
  "plan.pro.enterprise": "enterprise",
};
const CENTRAL_PRODUCT_IDS: Record<string, string> = {
  free: "plan.pro.free",
  starter: "plan.pro.starter",
  pro: "plan.pro.business",
  enterprise: "plan.pro.enterprise",
  boost_urgent_7d: "premium.urgent",
  boost_bump_7d: "premium.search_bump",
  boost_featured_7d: "premium.spotlight",
};

/** Compatibility view over the centralized catalog for existing clients. */
export class MonetizationService {
  constructor(
    private readonly rules: BusinessRulesService = businessRulesService,
    private readonly listings: IListingRepository = repositories.listings,
    private readonly publisherEntitlements: PublisherEntitlementsService = publisherEntitlementsService,
  ) {}

  async getAvailableBoosts(_listingId?: string): Promise<ListingBoostOption[]> {
    const catalog = await this.rules.getCatalog("FR");
    return catalog.products
      .filter(
        (product) =>
          ["premium_option", "sponsored_placement"].includes(product.kind) &&
          isCommercialProductPurchasable(product),
      )
      .map((product) => {
        const price =
          product.prices.find(
            (candidate) => candidate.billingPeriod === "once",
          ) || product.prices[0];
        return {
          id: PUBLIC_BOOST_IDS[product.id] || product.id,
          name: product.name,
          type: BOOST_TYPE[product.id] || "featured",
          durationDays: price.durationDays || 1,
          price: price.amount.amountMinor / 100,
          currency: price.amount.currency,
          description: product.description,
          badgeLabel: product.name,
        };
      });
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    const catalog = await this.rules.getCatalog("FR");
    return catalog.products
      .filter(
        (product) =>
          product.kind === "subscription" &&
          product.id.startsWith("plan.pro.") &&
          product.status === "active",
      )
      .map((product) => {
        const operationalEntitlements = product.entitlements.filter(
          (entitlement) =>
            isCommercialEntitlementOperational(entitlement) &&
            hasCommercialEntitlementValue(entitlement.value),
        );
        const monthly = product.prices.find(
          (price) => price.billingPeriod === "month",
        );
        const yearly = product.prices.find(
          (price) => price.billingPeriod === "year",
        );
        const maxListings = operationalEntitlements.find(
          (entry) => entry.key === "maxActiveListings",
        )?.value;
        return {
          id: LEGACY_PLAN_IDS[product.id] || product.id,
          name: product.name,
          priceMonthly: (monthly?.amount.amountMinor || 0) / 100,
          priceYearly: (yearly?.amount.amountMinor || 0) / 100,
          features: operationalEntitlements.map(
            (entry) => `${entry.label} : ${String(entry.value)}`,
          ),
          maxListings: typeof maxListings === "number" ? maxListings : 0,
          highlighted: product.recommended,
        };
      });
  }

  async beginProductCheckout(input: {
    accountId: string;
    productId: string;
    listingId?: string;
    idempotencyKey: string;
  }): Promise<MonetizationOrder> {
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Clé d’idempotence requise.",
      });
    }
    const productId = CENTRAL_PRODUCT_IDS[input.productId] || input.productId;
    const catalog = await this.rules.getCatalog("FR");
    const product = catalog.products.find(
      (candidate) => candidate.id === productId,
    );
    if (!product) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Offre commerciale introuvable.",
      });
    }
    let categoryId: string | undefined;
    if (input.listingId) {
      const listing = await this.listings.findById(input.listingId);
      if (!listing) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Annonce introuvable.",
        });
      }
      const decision = await this.publisherEntitlements.canPurchasePromotion(
        input.accountId,
        listing,
        product,
      );
      if (!decision.allowed) {
        throw new AppError({
          code: "FORBIDDEN",
          message: "Cette promotion n’est pas disponible pour cette annonce.",
          details: { reasonCode: decision.reasonCode },
        });
      }
      categoryId = listing.categoryId;
    } else if (
      ["premium_option", "sponsored_placement"].includes(product.kind)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une annonce est requise pour acheter cette visibilité.",
      });
    }
    const quote = await this.rules.createQuote(input.accountId, {
      productIds: [productId],
      listingId: input.listingId,
      categoryId,
      marketCode: "FR",
      idempotencyKey: `quote:${input.idempotencyKey}`,
    });
    return this.rules.createCheckout(
      input.accountId,
      quote.id,
      `checkout:${input.idempotencyKey}`,
    );
  }
}

export const monetizationService = new MonetizationService();
