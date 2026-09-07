import { describe, expect, it } from "vitest";
import { ReviewsService } from "../../src/modules/reviews/reviews.service.js";
import { DemoReviewRepository } from "../../src/infrastructure/database/repositories/review.repository.js";
import {
  DemoOrderRepository,
  type OrderRecord,
} from "../../src/infrastructure/database/repositories/order.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";

const completedOrder: OrderRecord = {
  id: "review-order",
  orderNumber: "CMD-REVIEW",
  transactionType: "DIRECT_PURCHASE",
  listingId: "list_1",
  buyerId: "user_thomas",
  sellerId: "user_camille",
  status: "completed",
  itemAmount: 250,
  itemAmountMinor: 25_000,
  protectionFee: 0,
  protectionFeeMinor: 0,
  shippingFee: 0,
  shippingFeeMinor: 0,
  totalCharged: 250,
  totalChargedMinor: 25_000,
  escrowSecuredAmount: 250,
  escrowSecuredAmountMinor: 25_000,
  currency: "EUR",
  deliveryMethod: "hand_delivery",
  paymentMethod: "card",
  handoverPinAttempts: 0,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T12:00:00Z",
};
const input = {
  transactionId: completedOrder.id,
  rating: 4,
  comment: "  Article conforme, échange agréable.  ",
};

function setup(patch: Partial<OrderRecord> = {}) {
  const reviews = new DemoReviewRepository();
  const orders = new DemoOrderRepository({
    [completedOrder.id]: { ...completedOrder, ...patch },
  });
  return {
    reviews,
    orders,
    service: new ReviewsService(
      reviews,
      orders,
      new DemoUserRepository(),
      new DemoListingRepository(),
    ),
  };
}

describe("transaction-verified reviews", () => {
  it("derives the buyer review recipient and public evidence from the order", async () => {
    const { service } = setup();
    await expect(
      service.getOrderEligibility(completedOrder.id, "user_thomas"),
    ).resolves.toEqual({ eligible: true, reason: null, review: null });
    const review = await service.submitReview("user_thomas", input);
    expect(review).toMatchObject({
      authorId: "user_thomas",
      targetUserId: "user_camille",
      rating: 4,
      comment: input.comment.trim(),
      verifiedTransaction: true,
      reviewerRole: "buyer",
    });
    expect(review.listingTitle.length).toBeGreaterThan(0);
    expect(review).not.toHaveProperty("orderId");
    expect(review).not.toHaveProperty("transactionId");
    await expect(
      service.getOrderEligibility(completedOrder.id, "user_thomas"),
    ).resolves.toEqual({ eligible: false, reason: "ALREADY_REVIEWED", review });
    await expect(service.getUserReviews("user_camille")).resolves.toEqual([
      review,
    ]);
  });

  it("allows the seller's independent review of the buyer, once", async () => {
    const { service } = setup();
    await service.submitReview("user_thomas", input);
    await expect(
      service.submitReview("user_camille", input),
    ).resolves.toMatchObject({
      authorId: "user_camille",
      targetUserId: "user_thomas",
      verifiedTransaction: true,
      reviewerRole: "seller",
    });
    await expect(
      service.submitReview("user_camille", input),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("deduplicates concurrent submissions and keeps the first persisted review", async () => {
    const { service } = setup();
    const outcomes = await Promise.allSettled([
      service.submitReview("user_thomas", input),
      service.submitReview("user_thomas", input),
    ]);
    expect(
      outcomes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    await expect(service.getUserReviews("user_camille")).resolves.toHaveLength(
      1,
    );
  });

  it.each([
    "initiated",
    "payment_pending",
    "escrow_funded",
    "shipped",
    "pin_pending",
    "disputed",
    "refund_pending",
    "refunded",
    "cancelled",
  ] as const)("rejects a %s order", async (status) => {
    const { service } = setup({ status });
    await expect(
      service.getOrderEligibility(completedOrder.id, "user_thomas"),
    ).resolves.toEqual({
      eligible: false,
      reason: "NOT_COMPLETED",
      review: null,
    });
    await expect(
      service.submitReview("user_thomas", input),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns the same 404 for missing, unrelated and self-dealing orders", async () => {
    const { service } = setup();
    await expect(service.submitReview("outsider", input)).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(
      service.getOrderEligibility(completedOrder.id, "outsider"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.submitReview("user_thomas", {
        ...input,
        transactionId: "missing",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      setup({ sellerId: "user_thomas" }).service.submitReview(
        "user_thomas",
        input,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([
    { rating: 0 },
    { rating: 6 },
    { rating: 3.5 },
    { comment: "    " },
    { comment: "short" },
    { comment: "x".repeat(2001) },
    { transactionId: "" },
    { authorId: "user_camille" },
    { targetUserId: "outsider" },
    { listingTitle: "Invented" },
  ])(
    "rejects invalid input or caller-controlled identity: %j",
    async (patch) => {
      await expect(
        setup().service.submitReview("user_thomas", { ...input, ...patch }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    },
  );

  it("never fabricates reviews for a profile without any", async () => {
    await expect(
      setup().service.getUserReviews("user_camille"),
    ).resolves.toEqual([]);
  });
});
