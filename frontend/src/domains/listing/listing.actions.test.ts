import { describe, expect, it } from "vitest";
import type { TransactionCapabilitiesResult } from "../publication/publication.types";
import type { Listing, UserProfile } from "../../types";
import { listingActionsResolver } from "./listing.actions";

const capabilities: TransactionCapabilitiesResult = {
  canContact: true,
  canDirectPurchase: true,
  canReserve: true,
  defaultModes: ["CONTACT_ONLY", "DIRECT_PURCHASE", "RESERVATION"],
};

const listing: Listing = {
  id: "listing-actions",
  title: "Annonce publique",
  description: "Description",
  price: 250,
  currency: "EUR",
  isNegotiable: true,
  isFreeDonation: false,
  categorySlug: "home_garden",
  subCategorySlug: "home_garden.furniture.sofas",
  categoryLabel: "Maison",
  subCategoryLabel: "Canapés",
  condition: "very_good",
  sellerId: "seller-actions",
  sellerName: "Vendeur",
  sellerType: "individual",
  sellerRating: 0,
  sellerReviewCount: 0,
  sellerIsVerified: true,
  sellerCity: "Paris",
  sellerPostalCode: "75001",
  city: "Paris",
  postalCode: "75001",
  department: "Paris",
  region: "Île-de-France",
  photos: [],
  coverImageUrl: "",
  deliveryOptions: [],
  isOnlinePaymentAvailable: true,
  isReservable: true,
  attributes: {},
  status: "active",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  expiresAt: "2026-11-01T00:00:00.000Z",
  viewsCount: 0,
  favoritesCount: 0,
  contactCount: 0,
};

const seller = { id: listing.sellerId } as UserProfile;
const buyer = { id: "buyer-actions" } as UserProfile;

describe("listingActionsResolver", () => {
  it("exposes owner controls without buyer mutations", () => {
    const result = listingActionsResolver.resolve({
      listing,
      viewer: seller,
      transactionCapabilities: capabilities,
    });

    expect(result.isOwner).toBe(true);
    expect(result.ownerActions).toEqual(["edit", "manage", "boost", "stats"]);
    expect(result.canDirectPurchase).toBe(false);
    expect(result.canReserve).toBe(false);
  });

  it("uses only listing capabilities explicitly returned by the API", () => {
    const result = listingActionsResolver.resolve({
      listing,
      viewer: buyer,
      transactionCapabilities: capabilities,
    });
    const withoutReservation = listingActionsResolver.resolve({
      listing: { ...listing, isReservable: undefined },
      viewer: buyer,
      transactionCapabilities: capabilities,
    });

    expect(result.primaryAction).toBe("direct_purchase");
    expect(result.canDirectPurchase).toBe(true);
    expect(result.canReserve).toBe(true);
    expect(withoutReservation.canReserve).toBe(false);
  });

  it("removes buyer mutations from inactive listings", () => {
    const result = listingActionsResolver.resolve({
      listing: { ...listing, status: "sold" },
      viewer: buyer,
      transactionCapabilities: capabilities,
    });

    expect(result.primaryAction).toBe("none");
    expect(result.canDirectPurchase).toBe(false);
    expect(result.canReserve).toBe(false);
    expect(result.statusNotice?.type).toBe("sold");
  });
});
