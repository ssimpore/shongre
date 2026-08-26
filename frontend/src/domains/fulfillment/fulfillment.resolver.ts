/**
 * SHONGRE FULFILLMENT & DELIVERY RESOLVER
 * Resolves seller fulfillment capabilities and buyer delivery quotes at checkout.
 *
 * CRITICAL PRINCIPLES:
 * 1. Fulfillment is independent from transaction method (Direct Purchase or Reservation).
 * 2. Seller enables capabilities; Buyer chooses among available delivery quotes at checkout.
 * 3. Authoritative server-side pricing calculation.
 */

import { taxonomyService } from "../taxonomy/taxonomy.service";
import { marketService } from "../market/market.service";
import { providerService } from "../providers/provider.service";
import {
  FulfillmentCapabilitiesResult,
  DeliveryQuote,
  OrderPricingBreakdown,
  PackageSpecs,
  PackageSizeTier,
} from "../publication/publication.types";
import { Listing } from "../../types";
import {
  calculateDemoMarketplaceCommission,
  getDemoDeliveryAmountMinor,
  getDemoTransactionCommercials,
} from "../monetization/demo-commercial-catalog";

export interface ResolveFulfillmentCapabilitiesParams {
  taxonomyNodeId: string;
  marketCode?: string;
  sellerType?: "individual" | "pro";
  price?: number;
}

export interface ResolveDeliveryQuotesParams {
  listing: Listing;
  taxonomyNodeId?: string;
  marketCode?: string;
  destinationPostalCode?: string;
  quantity?: number;
  packageSpecs?: PackageSpecs;
}

export interface CalculateOrderPricingParams {
  listing: Listing;
  quantity?: number;
  selectedQuote?: DeliveryQuote;
  marketCode?: string;
}

export class FulfillmentResolver {
  /**
   * Evaluates what fulfillment capabilities a seller is permitted to enable during publication.
   */
  resolveCapabilities(
    params: ResolveFulfillmentCapabilitiesParams,
  ): FulfillmentCapabilitiesResult {
    const {
      taxonomyNodeId,
      marketCode = marketService.getDefaultMarket().code,
      sellerType = "individual",
    } = params;
    const node = taxonomyService.getNode(taxonomyNodeId);
    const family = taxonomyService.getFamily(taxonomyNodeId);
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);

    // Default flags
    let allowHandDelivery = true;
    let allowParcelShipping = false;
    let allowBulkyDelivery = false;
    let allowSellerDelivery = sellerType === "pro";
    let allowStorePickup = sellerType === "pro";
    let allowDigital = false;
    let allowService = false;

    if (family === "real_estate" || family === "job") {
      allowHandDelivery = false;
      allowParcelShipping = false;
      allowBulkyDelivery = false;
      allowSellerDelivery = false;
      allowStorePickup = false;
    } else if (family === "service") {
      allowHandDelivery = false;
      allowParcelShipping = false;
      allowBulkyDelivery = false;
      allowService = true;
    } else if (family === "digital") {
      allowHandDelivery = false;
      allowParcelShipping = false;
      allowDigital = true;
    } else if (family === "vehicle") {
      allowHandDelivery = true;
      allowParcelShipping = false;
      allowBulkyDelivery = true; // vehicle transport
    } else if (family === "professional_equipment") {
      allowHandDelivery = true;
      allowParcelShipping = false;
      allowBulkyDelivery = true;
      allowSellerDelivery = true;
      allowStorePickup = sellerType === "pro";
    } else {
      // Standard Physical Product (Maison, Électronique, Mode, Loisirs...)
      allowHandDelivery = true;

      // Heavy / Bulky categories (furniture, large appliances) vs small parcels
      const nodeId = node?.id || "";
      const isBulkyCategory =
        nodeId.includes("furniture") ||
        nodeId.includes("large_appliances") ||
        nodeId.includes("mower") ||
        nodeId.includes("tables") ||
        nodeId.includes("sofas");

      if (isBulkyCategory) {
        allowParcelShipping = false;
        allowBulkyDelivery = true;
        allowSellerDelivery = true;
      } else {
        allowParcelShipping = effectiveMarket.delivery?.enabled ?? true;
        allowBulkyDelivery = false;
      }
    }

    const allowedModes = node?.capabilities?.fulfillmentModes || [
      "hand_delivery",
      "parcel_shipping",
    ];

    return {
      allowHandDelivery,
      allowParcelShipping,
      allowBulkyDelivery,
      allowSellerDelivery,
      allowStorePickup,
      allowDigital,
      allowService,
      allowedModes,
    };
  }

  /**
   * Resolves concrete delivery quotes available to the buyer at checkout.
   */
  resolveAvailableQuotes(params: ResolveDeliveryQuotesParams): DeliveryQuote[] {
    const {
      listing,
      marketCode = marketService.getDefaultMarket().code,
      packageSpecs,
    } = params;
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);
    const quotes: DeliveryQuote[] = [];

    const sellerDeliveryOpts = listing.deliveryOptions || [];
    const hasHandDelivery = sellerDeliveryOpts.some(
      (d) => d.type === "hand_delivery" && d.available,
    );
    const hasParcelDelivery = sellerDeliveryOpts.some(
      (d) =>
        (d.type === "relay_point" ||
          d.type === "home_delivery" ||
          d.type === "custom_carrier") &&
        d.available,
    );

    // 1. Hand Delivery (always available if seller enabled it)
    if (hasHandDelivery || sellerDeliveryOpts.length === 0) {
      quotes.push({
        id: "quote-hand-delivery",
        provider: "hand_delivery",
        code: "HAND_DELIVERY",
        title: "Remise en main propre",
        description: `À ${listing.city} (${listing.postalCode}) avec code PIN sécurisé`,
        deliveryType: "hand_delivery",
        price: 0,
        currency: effectiveMarket.localization.defaultCurrency,
        estimatedDeliveryDays: "Immédiat / Selon accord",
        isGuaranteed: true,
        trackingAvailable: false,
      });
    }

    // 2. Store Pickup (for Pro sellers)
    if (listing.sellerType === "pro") {
      quotes.push({
        id: "quote-store-pickup",
        provider: "store_pickup",
        code: "STORE_PICKUP",
        title: "Retrait en boutique",
        description: `Disponible en magasin (${listing.sellerCity || listing.city})`,
        deliveryType: "store_pickup",
        price: 0,
        currency: effectiveMarket.localization.defaultCurrency,
        estimatedDeliveryDays: "Sous 24h ouvrées",
        isGuaranteed: true,
        trackingAvailable: false,
      });
    }

    // 3. Parcel Shipping Quotes (if enabled by seller and market supports it)
    if (hasParcelDelivery) {
      const tier: PackageSizeTier = packageSpecs?.sizeTier || "medium";
      const commercialTier = tier === "heavy" ? "xlarge" : tier;
      const relayPrice =
        getDemoDeliveryAmountMinor("relay_point", commercialTier) / 100;
      const homePrice =
        getDemoDeliveryAmountMinor("home", commercialTier) / 100;
      const expressPrice =
        getDemoDeliveryAmountMinor("express", commercialTier) / 100;

      // Mondial Relay (Check market config and provider availability)
      const isRelayAvailable = providerService.isCapabilityAvailable(
        "delivery.relay_point",
        marketCode,
      );
      if (
        effectiveMarket.delivery?.carriers?.mondialRelay?.enabled !== false &&
        isRelayAvailable
      ) {
        quotes.push({
          id: "quote-mondial-relay",
          provider: "mondial_relay",
          code: "MONDIAL_RELAY",
          title: "Point Relais (Mondial Relay)",
          description:
            "Livraison en casier Locker ou point relais de votre choix",
          deliveryType: "relay_point",
          price: relayPrice,
          currency: effectiveMarket.localization.defaultCurrency,
          estimatedDeliveryDays: "3-4 jours ouvrés",
          isGuaranteed: true,
          trackingAvailable: true,
        });
      }

      // Colissimo Domicile (Check market config and provider availability)
      const isColissimoAvailable = providerService.isCapabilityAvailable(
        "delivery.home_delivery",
        marketCode,
      );
      if (
        effectiveMarket.delivery?.carriers?.colissimo?.enabled !== false &&
        isColissimoAvailable
      ) {
        quotes.push({
          id: "quote-colissimo",
          provider: "colissimo",
          code: "COLISSIMO_HOME",
          title: "Colissimo Domicile sans signature",
          description: "Livraison directement dans votre boîte aux lettres",
          deliveryType: "home_delivery",
          price: homePrice,
          currency: effectiveMarket.localization.defaultCurrency,
          estimatedDeliveryDays: "2-3 jours ouvrés",
          isGuaranteed: true,
          trackingAvailable: true,
        });
      }

      // Chronopost Express (Check market config and provider availability)
      const isExpressAvailable = providerService.isCapabilityAvailable(
        "delivery.express",
        marketCode,
      );
      if (
        effectiveMarket.delivery?.carriers?.chronopost?.enabled !== false &&
        isExpressAvailable
      ) {
        quotes.push({
          id: "quote-chronopost",
          provider: "chronopost",
          code: "CHRONOPOST_EXPRESS",
          title: "Chronopost Express 24H",
          description: "Livraison express garantie le lendemain avant 13h",
          deliveryType: "express",
          price: expressPrice,
          currency: effectiveMarket.localization.defaultCurrency,
          estimatedDeliveryDays: "24h ouvrées",
          isGuaranteed: true,
          trackingAvailable: true,
        });
      }
    }

    // 4. Bulky Delivery Quotes (Cocolis / transporteur spécialisé pour meubles et gros objets)
    const hasBulkyDelivery = sellerDeliveryOpts.some(
      (d) => d.type === "custom_carrier" && d.available,
    );
    const catSlug = (listing.categorySlug || "").toLowerCase();
    const isBulky =
      catSlug.includes("furniture") ||
      catSlug.includes("sofa") ||
      catSlug.includes("table") ||
      catSlug.includes("meuble");
    const isBulkyAvailable = providerService.isCapabilityAvailable(
      "delivery.bulky",
      marketCode,
    );
    if ((hasBulkyDelivery || isBulky) && isBulkyAvailable) {
      quotes.push({
        id: "quote-bulky-cocolis",
        provider: "cocolis",
        code: "BULKY_COCOLIS",
        title: "Livraison volumineuse (Cocolis / Transporteur spécialisé)",
        description:
          "Transport sécurisé sur rendez-vous pour meubles et objets lourds",
        deliveryType: "home_delivery",
        price: getDemoDeliveryAmountMinor("bulky") / 100,
        currency: effectiveMarket.localization.defaultCurrency,
        estimatedDeliveryDays: "3 à 7 jours ouvrés",
        isGuaranteed: true,
        trackingAvailable: true,
      });
    }

    // 5. Seller Delivery (Livraison directe par le vendeur dans sa zone)
    if (
      listing.sellerType === "pro" &&
      sellerDeliveryOpts.some((d) => d.type === "home_delivery" && d.available)
    ) {
      quotes.push({
        id: "quote-seller-direct-delivery",
        provider: "seller_delivery",
        code: "SELLER_DIRECT",
        title: "Livraison directe par le vendeur",
        description: `Livraison effectuée par le vendeur (${listing.city} et environs)`,
        deliveryType: "home_delivery",
        price: getDemoDeliveryAmountMinor("seller_direct") / 100,
        currency: effectiveMarket.localization.defaultCurrency,
        estimatedDeliveryDays: "1 à 3 jours ouvrés",
        isGuaranteed: true,
        trackingAvailable: false,
      });
    }

    return quotes;
  }

  /**
   * Authoritative server-side pricing breakdown calculation.
   */
  calculateOrderPricing(
    params: CalculateOrderPricingParams,
  ): OrderPricingBreakdown {
    const {
      listing,
      quantity = 1,
      selectedQuote,
      marketCode = marketService.getDefaultMarket().code,
    } = params;
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);

    const itemSubtotal = (listing.price || 0) * quantity;
    const deliveryFee = selectedQuote ? selectedQuote.price : 0;

    const commercials = getDemoTransactionCommercials(
      marketCode,
      listing.sellerType === "pro" ? "pro" : "individual",
    );
    const itemSubtotalMinor = Math.round(itemSubtotal * 100);

    // Server-shaped demo fee; API mode receives the immutable order quote.
    let buyerServiceFee = 0;
    if (itemSubtotal > 0 && selectedQuote?.code !== "HAND_DELIVERY") {
      buyerServiceFee =
        Math.round(
          itemSubtotalMinor * (commercials.protectionRateBps / 10_000) +
            commercials.protectionFixedMinor,
        ) / 100;
    }

    const sellerCommission =
      calculateDemoMarketplaceCommission(
        itemSubtotalMinor,
        marketCode,
        listing.sellerType === "pro" ? "pro" : "individual",
      ).totalCommissionMinor / 100;

    const discount = 0;
    const tax = 0; // VAT included in prices for consumers
    const buyerTotal = Number(
      (itemSubtotal + deliveryFee + buyerServiceFee - discount).toFixed(2),
    );
    const sellerNet = Number((itemSubtotal - sellerCommission).toFixed(2));

    return {
      itemSubtotal,
      quantity,
      deliveryFee,
      buyerServiceFee,
      sellerCommission,
      discount,
      tax,
      buyerTotal,
      sellerNet,
      currency: effectiveMarket.localization.defaultCurrency,
    };
  }
}

export const fulfillmentResolver = new FulfillmentResolver();
