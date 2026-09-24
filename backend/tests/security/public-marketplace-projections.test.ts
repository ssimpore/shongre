import { describe, expect, it, vi } from "vitest";
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
  marketCodes: ["FR"],
  marketPublications: [
    {
      marketCode: "FR",
      status: "active",
      isPrimary: true,
      priceMinor: 25_000,
      currency: "EUR",
      complianceState: "approved",
      sortDate: "2026-01-01T00:00:00.000Z",
      publishedAt: "2026-01-01T00:00:00.000Z",
      promotionState: "active",
      promotionType: "featured",
      promotionSource: "purchase",
      promotionSourceId: "private-purchase",
      promotionStartAt: "2026-01-01T00:00:00.000Z",
      promotionEndAt: "2099-01-01T00:00:00.000Z",
    },
  ],
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
    size: "M",
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
    expect(result?.marketPublications?.[0]).not.toHaveProperty(
      "promotionSource",
    );
    expect(result?.marketPublications?.[0]).not.toHaveProperty(
      "promotionSourceId",
    );
    expect(result?.promotionSource).toBe("purchase");
    expect(result?.promotionSourceId).toMatch(/^promotion_[a-f0-9]{64}$/);
    expect(result?.promotionSourceId).not.toContain("private-purchase");
    expect(result?.seller).not.toHaveProperty("email");
    expect(result?.seller).not.toHaveProperty("phone");
    expect(result?.seller).not.toHaveProperty("staffStatus");
    expect(result?.seller).not.toHaveProperty("staffRole");
    expect(result?.seller).not.toHaveProperty("customPermissions");
    expect(result?.attributes).toEqual({ size: "M" });
  });

  it("returns favorite card projections in one exact market collection", async () => {
    const repository = new DemoListingRepository({ published: listing() });
    const service = new ListingsService(repository, new DemoAIProvider());
    await service.setFavorite("listing-published", "buyer-safe", "FR", true);

    const collection = await service.getFavoriteCollection("buyer-safe", "FR");

    expect(collection.listingIds).toEqual(["listing-published"]);
    expect(collection.listings).toMatchObject([
      { id: "listing-published", marketCode: "FR" },
    ]);
    expect(collection.listings[0]).not.toHaveProperty("subscriptionId");
  });

  it("hydrates a public card set through one market-scoped repository batch", async () => {
    const visible = { ...listing(), id: "listing-visible" };
    const repository = new DemoListingRepository({ visible });
    const findPublicByIds = vi.spyOn(repository, "findPublicByIds");
    const service = new ListingsService(repository, new DemoAIProvider());

    const collection = await service.getPublicListingCards(
      [visible.id, "missing"],
      "FR",
    );

    expect(findPublicByIds).toHaveBeenCalledOnce();
    expect(findPublicByIds).toHaveBeenCalledWith([visible.id, "missing"], "FR");
    expect(collection).toMatchObject({
      total: 1,
      listings: [{ id: visible.id, marketCode: "FR" }],
    });
    expect(collection.listings[0]).not.toHaveProperty("subscriptionId");
  });

  it("returns every caller-owned listing status within the requested market", async () => {
    const published = listing();
    const draft = listing("draft");
    const otherMarket = {
      ...listing("sold"),
      id: "listing-other-market",
      marketCode: "BE",
      marketCodes: ["BE"],
      marketPublications: [
        {
          ...listing().marketPublications![0],
          marketCode: "BE",
        },
      ],
    };
    const service = new ListingsService(
      new DemoListingRepository({ published, draft, otherMarket }),
      new DemoAIProvider(),
    );

    const collection = await service.getOwnedListings(seller.id, "FR");

    expect(collection.total).toBe(2);
    expect(collection.listings.map(({ id }) => id).sort()).toEqual([
      "listing-draft",
      "listing-published",
    ]);
  });

  it("allows only published or reserved listings to transition to sold", async () => {
    const repository = new DemoListingRepository({ published: listing() });
    const service = new ListingsService(repository, new DemoAIProvider());

    await expect(
      service.markListingSold("listing-published"),
    ).resolves.toMatchObject({ id: "listing-published", status: "sold" });
    await expect(
      service.markListingSold("listing-published"),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("deletes only a never-published draft and archives anything with public history", async () => {
    const repository = new DemoListingRepository({
      draft: listing("draft"),
      published: listing("published"),
      sold: listing("sold"),
      reserved: listing("reserved"),
    });
    const service = new ListingsService(repository, new DemoAIProvider());

    await expect(service.deleteListing("listing-draft")).resolves.toEqual({
      outcome: "deleted",
    });
    await expect(repository.findById("listing-draft")).resolves.toBeNull();

    // Conversations, orders, reports and paid placements hang off a public
    // listing; removing it must keep them, so it leaves the marketplace
    // as an archive rather than a cascade.
    for (const id of ["listing-published", "listing-sold"]) {
      await expect(service.deleteListing(id)).resolves.toEqual({
        outcome: "archived",
      });
      await expect(repository.findById(id)).resolves.toMatchObject({
        status: "archived",
      });
    }
    await expect(service.deleteListing("listing-published")).resolves.toEqual({
      outcome: "archived",
    });

    await expect(
      service.deleteListing("listing-reserved"),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      repository.findById("listing-reserved"),
    ).resolves.toMatchObject({ status: "reserved" });
    await expect(service.deleteListing("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("omits an unavailable favorite id when no public card can be returned", async () => {
    const visible = { ...listing(), id: "listing-visible" };
    const laterArchived = { ...listing(), id: "listing-later-archived" };
    const repository = new DemoListingRepository({
      visible,
      laterArchived,
    });
    const service = new ListingsService(repository, new DemoAIProvider());

    await service.setFavorite(visible.id, "buyer-safe", "FR", true);
    await service.setFavorite(laterArchived.id, "buyer-safe", "FR", true);
    await repository.update(laterArchived.id, { status: "archived" });

    const collection = await service.getFavoriteCollection("buyer-safe", "FR");

    expect(collection.listingIds).toEqual([visible.id]);
    expect(collection.listings.map((item) => item.id)).toEqual([visible.id]);
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
        isFeatured: false,
        viewCount: 10_000,
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        rejectedFields: ["isFeatured", "status", "viewCount"],
      },
    });

    const unchanged = await repository.findById("listing-published");
    expect(unchanged?.isFeatured).toBe(true);
    expect(unchanged?.viewCount).toBe(0);
  });
});
