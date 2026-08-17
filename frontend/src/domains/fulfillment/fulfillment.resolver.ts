/**
 * SHONGRE FULFILLMENT & DELIVERY RESOLVER
 * Resolves seller fulfillment capabilities and buyer delivery quotes at checkout.
 *
 * CRITICAL PRINCIPLES:
 * 1. Fulfillment is independent from transaction method (Direct Purchase or Reservation).
 * 2. Seller enables capabilities; Buyer chooses among available delivery quotes at checkout.
 * 3. Authoritative server-side pricing calculation.
 */

import { taxonomyService } from '../taxonomy/taxonomy.service';
import { marketService } from '../market/market.service';
import { providerService } from '../providers/provider.service';
import {
  FulfillmentCapabilitiesResult,
  DeliveryQuote,
  OrderPricingBreakdown,
  PackageSpecs,
  PackageSizeTier,
} from '../publication/publication.types';
import { Listing, DeliveryOption } from '../../types';

export interface ResolveFulfillmentCapabilitiesParams {
  taxonomyNodeId: string;
  marketCode?: string;
  sellerType?: 'individual' | 'pro';
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
  resolveCapabilities(params: ResolveFulfillmentCapabilitiesParams): FulfillmentCapabilitiesResult {
    const { taxonomyNodeId, marketCode = 'FR', sellerType = 'individual', price = 0 } = params;
    const node = taxonomyService.getNode(taxonomyNodeId);
    const family = taxonomyService.getFamily(taxonomyNodeId);
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);

    // Default flags
    let allowHandDelivery = true;
    let allowParcelShipping = false;
    let allowBulkyDelivery = false;
    let allowSellerDelivery = sellerType === 'pro';
    let allowStorePickup = sellerType === 'pro';
    let allowDigital = false;
    let allowService = false;

    if (family === 'real_estate' || family === 'job') {
      allowHandDelivery = false;
      allowParcelShipping = false;
      allowBulkyDelivery = false;
      allowSellerDelivery = false;
      allowStorePickup = false;
    } else if (family === 'service') {
      allowHandDelivery = false;
      allowParcelShipping = false;
      allowBulkyDelivery = false;
      allowService = true;
    } else if (family === 'digital') {
      allowHandDelivery = false;
      allowParcelShipping = false;
      allowDigital = true;
    } else if (family === 'vehicle') {
      allowHandDelivery = true;
      allowParcelShipping = false;
      allowBulkyDelivery = true; // vehicle transport
    } else if (family === 'professional_equipment') {
      allowHandDelivery = true;
      allowParcelShipping = false;
      allowBulkyDelivery = true;
      allowSellerDelivery = true;
      allowStorePickup = sellerType === 'pro';
    } else {
      // Standard Physical Product (Maison, Électronique, Mode, Loisirs...)
      allowHandDelivery = true;

      // Heavy / Bulky categories (furniture, large appliances) vs small parcels
      const nodeId = node?.id || '';
      const isBulkyCategory =
        nodeId.includes('furniture') ||
        nodeId.includes('large_appliances') ||
        nodeId.includes('mower') ||
        nodeId.includes('tables') ||
        nodeId.includes('sofas');

      if (isBulkyCategory) {
        allowParcelShipping = false;
        allowBulkyDelivery = true;
        allowSellerDelivery = true;
      } else {
        allowParcelShipping = effectiveMarket.delivery?.enabled ?? true;
        allowBulkyDelivery = false;
      }
    }

    const allowedModes = (node?.capabilities?.fulfillmentModes || ['hand_delivery', 'parcel_shipping']);

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
    const { listing, marketCode = 'FR', destinationPostalCode, quantity = 1, packageSpecs } = params;
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);
    const quotes: DeliveryQuote[] = [];

    const sellerDeliveryOpts = listing.deliveryOptions || [];
    const hasHandDelivery = sellerDeliveryOpts.some((d) => d.type === 'hand_delivery' && d.available);
    const hasParcelDelivery = sellerDeliveryOpts.some(
      (d) => (d.type === 'relay_point' || d.type === 'home_delivery' || d.type === 'custom_carrier') && d.available
    );

    // 1. Hand Delivery (always available if seller enabled it)
    if (hasHandDelivery || sellerDeliveryOpts.length === 0) {
      quotes.push({
        id: 'quote-hand-delivery',
        provider: 'hand_delivery',
        code: 'HAND_DELIVERY',
        title: 'Remise en main propre',
        description: `Gratuit à ${listing.city} (${listing.postalCode}) avec code PIN sécurisé`,
        deliveryType: 'hand_delivery',
        price: 0,
        currency: effectiveMarket.localization.defaultCurrency || 'EUR',
        estimatedDeliveryDays: 'Immédiat / Selon accord',
        isGuaranteed: true,
        trackingAvailable: false,
      });
    }

    // 2. Store Pickup (for Pro sellers)
    if (listing.sellerType === 'pro') {
      quotes.push({
        id: 'quote-store-pickup',
        provider: 'store_pickup',
        code: 'STORE_PICKUP',
        title: 'Retrait en boutique',
        description: `Retrait gratuit en magasin (${listing.sellerCity || listing.city})`,
        deliveryType: 'store_pickup',
        price: 0,
        currency: effectiveMarket.localization.defaultCurrency || 'EUR',
        estimatedDeliveryDays: 'Sous 24h ouvrées',
        isGuaranteed: true,
        trackingAvailable: false,
      });
    }

    // 3. Parcel Shipping Quotes (if enabled by seller and market supports it)
    if (hasParcelDelivery) {
      const tier: PackageSizeTier = packageSpecs?.sizeTier || 'medium';
      let relayPrice = effectiveMarket.delivery?.carriers?.mondialRelay?.defaultFee ?? 4.49;
      let homePrice = effectiveMarket.delivery?.carriers?.colissimo?.defaultFee ?? 6.99;
      let expressPrice = effectiveMarket.delivery?.carriers?.chronopost?.defaultFee ?? 11.99;

      if (tier === 'small') {
        relayPrice = Math.max(3.49, relayPrice - 0.5);
        homePrice = Math.max(4.99, homePrice - 1.0);
        expressPrice = Math.max(8.99, expressPrice - 2.0);
      } else if (tier === 'large') {
        relayPrice = relayPrice + 1.5;
        homePrice = homePrice + 2.0;
        expressPrice = expressPrice + 3.0;
      } else if (tier === 'xlarge') {
        relayPrice = relayPrice + 5.0;
        homePrice = homePrice + 8.0;
        expressPrice = expressPrice + 12.0;
      }

      // Mondial Relay (Check market config and provider availability)
      const isRelayAvailable = providerService.isCapabilityAvailable('delivery.relay_point', marketCode);
      if (effectiveMarket.delivery?.carriers?.mondialRelay?.enabled !== false && isRelayAvailable) {
        quotes.push({
          id: 'quote-mondial-relay',
          provider: 'mondial_relay',
          code: 'MONDIAL_RELAY',
          title: 'Point Relais (Mondial Relay)',
          description: 'Livraison en casier Locker ou point relais de votre choix',
          deliveryType: 'relay_point',
          price: relayPrice,
          currency: effectiveMarket.localization.defaultCurrency || 'EUR',
          estimatedDeliveryDays: '3-4 jours ouvrés',
          isGuaranteed: true,
          trackingAvailable: true,
        });
      }

      // Colissimo Domicile (Check market config and provider availability)
      const isColissimoAvailable = providerService.isCapabilityAvailable('delivery.home_delivery', marketCode);
      if (effectiveMarket.delivery?.carriers?.colissimo?.enabled !== false && isColissimoAvailable) {
        quotes.push({
          id: 'quote-colissimo',
          provider: 'colissimo',
          code: 'COLISSIMO_HOME',
          title: 'Colissimo Domicile sans signature',
          description: 'Livraison directement dans votre boîte aux lettres',
          deliveryType: 'home_delivery',
          price: homePrice,
          currency: effectiveMarket.localization.defaultCurrency || 'EUR',
          estimatedDeliveryDays: '2-3 jours ouvrés',
          isGuaranteed: true,
          trackingAvailable: true,
        });
      }

      // Chronopost Express (Check market config and provider availability)
      const isExpressAvailable = providerService.isCapabilityAvailable('delivery.express', marketCode);
      if (effectiveMarket.delivery?.carriers?.chronopost?.enabled !== false && isExpressAvailable) {
        quotes.push({
          id: 'quote-chronopost',
          provider: 'chronopost',
          code: 'CHRONOPOST_EXPRESS',
          title: 'Chronopost Express 24H',
          description: 'Livraison express garantie le lendemain avant 13h',
          deliveryType: 'express',
          price: expressPrice,
          currency: effectiveMarket.localization.defaultCurrency || 'EUR',
          estimatedDeliveryDays: '24h ouvrées',
          isGuaranteed: true,
          trackingAvailable: true,
        });
      }
    }

    // 4. Bulky Delivery Quotes (Cocolis / transporteur spécialisé pour meubles et gros objets)
    const hasBulkyDelivery = sellerDeliveryOpts.some((d) => d.type === 'custom_carrier' && d.available);
    const catSlug = (listing.categorySlug || '').toLowerCase();
    const isBulky = catSlug.includes('furniture') || catSlug.includes('sofa') || catSlug.includes('table') || catSlug.includes('meuble');
    const isBulkyAvailable = providerService.isCapabilityAvailable('delivery.bulky', marketCode);
    if ((hasBulkyDelivery || isBulky) && isBulkyAvailable) {
      quotes.push({
        id: 'quote-bulky-cocolis',
        provider: 'cocolis',
        code: 'BULKY_COCOLIS',
        title: 'Livraison volumineuse (Cocolis / Transporteur spécialisé)',
        description: 'Transport sécurisé sur rendez-vous pour meubles et objets lourds',
        deliveryType: 'home_delivery',
        price: 29.90,
        currency: effectiveMarket.localization.defaultCurrency || 'EUR',
        estimatedDeliveryDays: '3 à 7 jours ouvrés',
        isGuaranteed: true,
        trackingAvailable: true,
      });
    }

    // 5. Seller Delivery (Livraison directe par le vendeur dans sa zone)
    if (listing.sellerType === 'pro' && sellerDeliveryOpts.some((d) => d.type === 'home_delivery' && d.available)) {
      quotes.push({
        id: 'quote-seller-direct-delivery',
        provider: 'seller_delivery',
        code: 'SELLER_DIRECT',
        title: 'Livraison directe par le vendeur',
        description: `Livraison effectuée par le vendeur (${listing.city} et environs)`,
        deliveryType: 'home_delivery',
        price: 15.00,
        currency: effectiveMarket.localization.defaultCurrency || 'EUR',
        estimatedDeliveryDays: '1 à 3 jours ouvrés',
        isGuaranteed: true,
        trackingAvailable: false,
      });
    }

    return quotes;
  }

  /**
   * Authoritative server-side pricing breakdown calculation.
   */
  calculateOrderPricing(params: CalculateOrderPricingParams): OrderPricingBreakdown {
    const { listing, quantity = 1, selectedQuote, marketCode = 'FR' } = params;
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);

    const itemSubtotal = (listing.price || 0) * quantity;
    const deliveryFee = selectedQuote ? selectedQuote.price : 0;

    // Buyer protection service fee (e.g. 0.99 € + 4% of item subtotal, capped at 49 €)
    let buyerServiceFee = 0;
    if (itemSubtotal > 0 && selectedQuote?.code !== 'HAND_DELIVERY') {
      buyerServiceFee = Number((0.99 + itemSubtotal * 0.04).toFixed(2));
      if (buyerServiceFee > 49) buyerServiceFee = 49;
    }

    // Seller commission (0% for Particuliers, 5% for Pros unless plan exemption)
    let sellerCommission = 0;
    if (listing.sellerType === 'pro') {
      sellerCommission = Number((itemSubtotal * 0.05).toFixed(2));
    }

    const discount = 0;
    const tax = 0; // VAT included in prices for consumers
    const buyerTotal = Number((itemSubtotal + deliveryFee + buyerServiceFee - discount).toFixed(2));
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
      currency: effectiveMarket.localization.defaultCurrency || 'EUR',
    };
  }
}

export const fulfillmentResolver = new FulfillmentResolver();
