import { beforeEach, describe, expect, it } from "vitest";
import { listingRepository } from "../../../repositories/listing.repository";
import { storageService } from "../../../services/storage.service";
import { DemoPromotionsService } from "./demo-promotions.service";

describe("DemoPromotionsService", () => {
  beforeEach(() => storageService.setCurrentUserKey("seller_camille"));

  it("requires an existing listing and activates a canonical offer idempotently", async () => {
    const service = new DemoPromotionsService();
    expect(await service.getAvailableBoosts()).toEqual([]);

    const offers = await service.getAvailableBoosts("list-103");
    expect(offers.map((offer) => offer.productId)).toEqual([
      "premium.urgent",
      "premium.search_bump",
      "premium.highlight",
      "premium.spotlight",
    ]);
    const offer = offers[0];
    const input = {
      paymentMethod: "demo-card",
      idempotencyKey: "demo-listing-promotion-list-103-urgent",
    };
    const first = await service.applyBoost("list-103", offer.productId, input);
    const replay = await service.applyBoost("list-103", offer.productId, input);

    expect(replay).toEqual(first);
    expect(await listingRepository.getListingById("list-103")).toMatchObject({
      promotionState: "active",
      promotionType: "urgent_badge",
      promotionSource: "purchase",
    });
  });
});
