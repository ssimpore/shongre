/**
 * SHONGRE LISTING ACTIONS RESOLVER
 * Authoritative evaluation of viewer permissions, owner controls vs buyer actions,
 * status notices, and primary CTA determination for the listing detail page.
 */

import { Listing, UserProfile } from "../../types";
import { TransactionCapabilitiesResult } from "../publication/publication.types";

export interface ListingStatusNotice {
  type: "reserved" | "sold" | "expired" | "paused" | "moderated";
  title: string;
  message: string;
  isBuyerReserver?: boolean;
}

export type PrimaryBuyerAction =
  "direct_purchase" | "reservation" | "contact" | "none";

export interface ResolvedListingActions {
  isOwner: boolean;
  ownerActions: Array<"edit" | "manage" | "boost" | "stats">;
  primaryAction: PrimaryBuyerAction;
  canDirectPurchase: boolean;
  canReserve: boolean;
  canContact: boolean;
  canMakeOffer: boolean;
  statusNotice: ListingStatusNotice | null;
}

export interface ResolveListingActionsParams {
  listing: Listing;
  viewer?: UserProfile | null;
  seller?: UserProfile | null;
  transactionCapabilities: TransactionCapabilitiesResult;
}

export class ListingActionsResolver {
  resolve(params: ResolveListingActionsParams): ResolvedListingActions {
    const { listing, viewer, transactionCapabilities } = params;
    const isOwner = !!(viewer && viewer.id === listing.sellerId);

    // 1. Owner Actions Resolution
    if (isOwner) {
      return {
        isOwner: true,
        ownerActions: ["edit", "manage", "boost", "stats"],
        primaryAction: "none",
        canDirectPurchase: false,
        canReserve: false,
        canContact: false,
        canMakeOffer: false,
        statusNotice: null,
      };
    }

    // 2. Status Notice Resolution (when not active)
    let statusNotice: ListingStatusNotice | null = null;
    const isBuyerReserver = !!(viewer && listing.activeReservationId);

    if (listing.status === "reserved") {
      statusNotice = {
        type: "reserved",
        title: isBuyerReserver
          ? "Votre réservation en cours"
          : "Article actuellement réservé",
        message: isBuyerReserver
          ? "Vous avez réservé cet article avec paiement sous séquestre. Consultez votre espace achats."
          : "Un paiement sous séquestre sécurisé est en cours de validation pour cet article.",
        isBuyerReserver,
      };
    } else if (listing.status === "sold") {
      statusNotice = {
        type: "sold",
        title: "Article vendu",
        message:
          "Cet article a trouvé preneur et n'est plus disponible à la vente.",
      };
    } else if (listing.status === "expired") {
      statusNotice = {
        type: "expired",
        title: "Annonce expirée",
        message: "Cette annonce a expiré et n'est plus disponible.",
      };
    } else if (
      listing.status === "archived" ||
      listing.status === "pending_review" ||
      listing.status === "draft"
    ) {
      statusNotice = {
        type: "moderated",
        title: "Annonce indisponible",
        message: "Cette annonce n'est plus accessible sur la plateforme.",
      };
    }

    // If listing is not active, disable buyer transactional CTAs
    if (listing.status !== "active") {
      return {
        isOwner: false,
        ownerActions: [],
        primaryAction: "none",
        canDirectPurchase: false,
        canReserve: false,
        canContact: listing.status === "reserved", // Still allow contact if reserved
        canMakeOffer: false,
        statusNotice,
      };
    }

    // 3. Active Listing: Evaluate Buyer Capabilities
    const canDirectPurchase = !!(
      listing.isOnlinePaymentAvailable &&
      transactionCapabilities.canDirectPurchase &&
      listing.price > 0 &&
      !listing.isFreeDonation
    );

    const canReserve = !!(
      (listing.isReservable ?? true) &&
      transactionCapabilities.canReserve &&
      listing.price > 0 &&
      !listing.isFreeDonation
    );

    const canContact = transactionCapabilities.canContact;
    const canMakeOffer = !!(
      listing.isNegotiable &&
      listing.price > 0 &&
      !listing.isFreeDonation
    );

    // 4. Primary CTA Priority
    let primaryAction: PrimaryBuyerAction = "contact";
    if (canDirectPurchase) {
      primaryAction = "direct_purchase";
    } else if (canReserve) {
      primaryAction = "reservation";
    } else if (canContact) {
      primaryAction = "contact";
    }

    return {
      isOwner: false,
      ownerActions: [],
      primaryAction,
      canDirectPurchase,
      canReserve,
      canContact,
      canMakeOffer,
      statusNotice: null,
    };
  }
}

export const listingActionsResolver = new ListingActionsResolver();
