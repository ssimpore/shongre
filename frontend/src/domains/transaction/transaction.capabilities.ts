/**
 * SHONGRE TRANSACTION CAPABILITIES RESOLVER
 * Evaluates whether Contact Direct, Direct Online Purchase, and Reservation
 * are supported for a specific listing, category, seller and market context.
 *
 * CRITICAL RULE:
 * Direct Online Purchase (DIRECT_PURCHASE) is a standalone first-class mode
 * that does NOT require or depend on a reservation workflow.
 */

import { ListingFamily } from "../taxonomy/taxonomy.types";
import { taxonomyService } from "../taxonomy/taxonomy.service";
import { marketService } from "../market/market.service";
import {
  TransactionCapabilitiesResult,
  TransactionMode,
  ListingIntent,
} from "../publication/publication.types";

export interface ResolveTransactionParams {
  taxonomyNodeId: string;
  marketCode?: string;
  sellerType?: "individual" | "pro";
  sellerIsVerified?: boolean;
  listingIntent?: ListingIntent;
  price?: number;
  stock?: number;
}

export class TransactionCapabilitiesService {
  /**
   * Authoritative evaluation of valid transaction modes for a listing.
   */
  resolve(params: ResolveTransactionParams): TransactionCapabilitiesResult {
    const {
      taxonomyNodeId,
      marketCode = marketService.getDefaultMarket().code,
      sellerIsVerified = true,
      listingIntent = "SELL",
      price = 0,
      stock = 1,
    } = params;

    const node = taxonomyService.getNode(taxonomyNodeId);
    const family = taxonomyService.getFamily(taxonomyNodeId);
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);

    // 1. Base contact is universally supported (traditional classifieds)
    let canContact = true;

    // 2. Direct Online Purchase eligibility
    // Must be allowed by category capabilities, market payment config, positive price, and verified seller
    let canDirectPurchase = false;
    let directPurchaseDisabledReason: string | undefined;

    // Categories where direct online purchase is fundamentally not applicable
    const noDirectPurchaseFamilies: ListingFamily[] = [
      "real_estate",
      "job",
      "service",
    ];
    if (noDirectPurchaseFamilies.includes(family)) {
      canDirectPurchase = false;
      directPurchaseDisabledReason =
        "L'achat en ligne direct n'est pas applicable à cette catégorie.";
    } else if (
      listingIntent === "DONATE" ||
      listingIntent === "GIVE" ||
      listingIntent === "EXCHANGE" ||
      price <= 0
    ) {
      canDirectPurchase = false;
      directPurchaseDisabledReason =
        "Le paiement en ligne requiert un prix de vente positif.";
    } else if (stock <= 0) {
      canDirectPurchase = false;
      directPurchaseDisabledReason = "Cet article n'est plus disponible.";
    } else if (!sellerIsVerified) {
      canDirectPurchase = false;
      directPurchaseDisabledReason =
        "Le vendeur doit être vérifié pour proposer le paiement sécurisé.";
    } else if (!effectiveMarket.payments.enabled) {
      canDirectPurchase = false;
      directPurchaseDisabledReason =
        "Le paiement sécurisé n'est pas activé sur ce marché.";
    } else if (node && node.capabilities?.securePaymentAllowed === false) {
      canDirectPurchase = false;
      directPurchaseDisabledReason =
        "Le paiement en ligne n'est pas autorisé pour cette catégorie.";
    } else {
      canDirectPurchase = true;
    }

    // 3. Reservation eligibility
    // Standalone reservation workflow (e.g. for high-value items, vehicles, second-hand furniture)
    let canReserve = false;
    let reservationDisabledReason: string | undefined;

    if (stock <= 0) {
      canReserve = false;
      reservationDisabledReason = "Cet article n'est plus disponible.";
    } else if (family === "job") {
      canReserve = false;
      reservationDisabledReason =
        "La réservation n'est pas applicable aux offres d'emploi.";
    } else if (listingIntent === "DONATE" || listingIntent === "GIVE") {
      canReserve = false;
      reservationDisabledReason =
        "Les dons gratuits ne nécessitent pas de réservation payante.";
    } else if (node && node.capabilities?.reservationAllowed === false) {
      canReserve = false;
      reservationDisabledReason =
        "La réservation n'est pas disponible pour cette catégorie.";
    } else {
      canReserve = true;
    }

    // Determine default modes
    const defaultModes: TransactionMode[] = ["CONTACT_ONLY"];
    if (canDirectPurchase) {
      defaultModes.push("DIRECT_PURCHASE");
    }
    if (canReserve) {
      defaultModes.push("RESERVATION");
    }

    return {
      canContact,
      canDirectPurchase,
      canReserve,
      defaultModes,
      directPurchaseDisabledReason,
      reservationDisabledReason,
    };
  }
}

export const transactionCapabilitiesService =
  new TransactionCapabilitiesService();
