import { describe, expect, it } from "vitest";
import {
  DemoListingRepository,
  type IListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { DemoAIProvider } from "../../src/integrations/providers/ai.provider.js";
import { ListingsService } from "../../src/modules/listings/listings.service.js";
import { UsersService } from "../../src/modules/users/users.service.js";
import type { Listing, UserProfile } from "../../src/shared/types/index.js";

const seller: UserProfile = {
  id: "seller-safe",
  slug: "seller-safe",
  email: "private@example.test",
  phone: "+33600000000",
  name: "Vendeur public",
  accountType: "individual",
  primaryRole: "individual_seller",
  role: "individual_seller",
  sellerType: "individual",
  status: "active",
  customPermissions: ["listing.create"],
  country: "FR",
  city: "Lyon",
  postalCode: "69002",
  isVerified: true,
  isIdentityVerified: true,
  isPhoneVerified: true,
  isEmailVerified: true,
  rating: 4.8,
  reviewCount: 12,
  responseRatePercent: 97,
};

const listing = (status: Listing["status"] = "published"): Listing => ({
  id: `listing-${status}`,
  sellerId: seller.id,
  seller,
  categoryId: "bicycles",
  title: "Vélo urbain",
  description: "Très bon état",
  price: 250,
  currency: "EUR",
  status,
  condition: "tres-bon-etat",
  marketCode: "FR",
  city: "Lyon",
  postalCode: "69002",
  country: "FR",
  allowedDelivery: ["hand_delivery"],
  images: [],
  publisherStatus: "active",
  subscriptionId: "private-subscription",
  entitlementSnapshot: { maxActiveListings: 50 },
  promotionSourceId: "private-purchase",
  externalStockId: "private-stock-id",
  duplicateGroupId: "private-duplicate-id",
  safetyRiskScore: 84,
  attributes: {
    frameSize: "M",
    confirmedReportCount: 4,
    mediaQualityScore: 0.5,
  },
  viewCount: 0,
  favoriteCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-03-01T00:00:00.000Z",
});

describe("public marketplace projections", () => {
  it("excludes every Staff lifecycle state from customer seller profiles", async () => {
    const users = new UsersService(
      new DemoUserRepository({
        [seller.email]: seller,
        "staff@example.test": {
          ...seller,
          id: "staff-user",
          slug: "staff-user",
          email: "staff@example.test",
          accountType: "individual",
          staffStatus: "active",
          staffRole: "admin",
          primaryRole: "individual_seller",
          role: "individual_seller",
        },
      }),
    );

    const publicSeller = await users.getPublicUserById(seller.id);
    expect(publicSeller).toMatchObject({
      id: seller.id,
      name: seller.name,
      sellerType: "individual",
    });
    expect(publicSeller).not.toHaveProperty("email");
    expect(publicSeller).not.toHaveProperty("phone");
    expect(publicSeller).not.toHaveProperty("staffRole");
    expect(publicSeller).not.toHaveProperty("isIdentityVerified");
    const publicStaffSeller = await users.getPublicUserById("staff-user");
    expect(publicStaffSeller).toBeNull();
  });

  it("never exposes private listing, seller, ranking, or risk fields", async () => {
    const service = new ListingsService(
      new DemoListingRepository({ published: listing() }),
      new DemoAIProvider(),
    );
    const result = await service.getListingById("listing-published", "FR");

    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("safetyRiskScore");
    expect(result).not.toHaveProperty("subscriptionId");
    expect(result).not.toHaveProperty("entitlementSnapshot");
    expect(result).not.toHaveProperty("externalStockId");
    expect(result?.seller).not.toHaveProperty("email");
    expect(result?.seller).not.toHaveProperty("phone");
    expect(result?.seller).not.toHaveProperty("staffStatus");
    expect(result?.seller).not.toHaveProperty("staffRole");
    expect(result?.seller).not.toHaveProperty("customPermissions");
    expect(result?.attributes).toEqual({ frameSize: "M" });
  });

  it.each(["draft", "flagged", "rejected", "archived"] as const)(
    "does not return a %s listing from the public detail service",
    async (status) => {
      const service = new ListingsService(
        new DemoListingRepository({ [status]: listing(status) }),
        new DemoAIProvider(),
      );
      expect(
        await service.getListingById(`listing-${status}`, "FR"),
      ).toBeNull();
    },
  );

  it("rejects authoritative and promotion fields in seller updates", async () => {
    const repository: IListingRepository = new DemoListingRepository({
      published: listing(),
    });
    const service = new ListingsService(repository, new DemoAIProvider());

    await expect(
      service.updateSellerListing("listing-published", {
        status: "published",
        isFeatured: true,
        viewCount: 10_000,
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        rejectedFields: ["isFeatured", "status", "viewCount"],
      },
    });

    const unchanged = await repository.findById("listing-published");
    expect(unchanged?.isFeatured).toBeUndefined();
    expect(unchanged?.viewCount).toBe(0);
  });
});
