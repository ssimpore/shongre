import { describe, expect, it, vi } from "vitest";
import { ReviewsService } from "../../src/modules/reviews/reviews.service.js";
import { ReviewReminderWorker } from "../../src/workers/reviews/review-reminder-worker.js";
import { DemoReviewRepository } from "../../src/infrastructure/database/repositories/review.repository.js";
import {
  DemoOrderRepository,
  type OrderRecord,
} from "../../src/infrastructure/database/repositories/order.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { notificationsService } from "../../src/modules/notifications/notifications.service.js";

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
  completedAt: "2026-09-01T12:00:00Z",
};
const submission = {
  transactionId: completedOrder.id,
  rating: 4,
  comment: "Article conforme, échange agréable.",
};

function setup(orders: Record<string, OrderRecord> = {}) {
  const reviews = new DemoReviewRepository();
  const orderRepository = new DemoOrderRepository({
    [completedOrder.id]: completedOrder,
    ...orders,
  });
  const users = new DemoUserRepository();
  const listings = new DemoListingRepository();
  return {
    reviews,
    orders: orderRepository,
    users,
    listings,
    service: new ReviewsService(reviews, orderRepository, users, listings),
  };
}

describe("review replies", () => {
  it("lets only the person reviewed answer, once, and shows the answer publicly", async () => {
    const { service } = setup();
    const review = await service.submitReview("user_thomas", submission);
    await expect(
      service.replyToReview("user_thomas", review.id, {
        comment: "Merci, ravi que la table vous plaise.",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.replyToReview("user_lucas", review.id, {
        comment: "Merci, ravi que la table vous plaise.",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const answered = await service.replyToReview("user_camille", review.id, {
      comment: "  Merci, ravi que la table vous plaise.  ",
    });
    expect(answered.reply).toMatchObject({
      comment: "Merci, ravi que la table vous plaise.",
    });
    const replaced = await service.replyToReview("user_camille", review.id, {
      comment: "Merci encore pour cet échange, à bientôt.",
    });
    expect(replaced.reply?.comment).toBe(
      "Merci encore pour cet échange, à bientôt.",
    );
    expect(replaced.reply?.createdAt).toBe(answered.reply?.createdAt);
    const [listed] = await service.getUserReviews("user_camille");
    expect(listed.reply?.comment).toBe(replaced.reply?.comment);
  });

  it("rejects an answer outside the 10 to 2000 character window", async () => {
    const { service } = setup();
    const review = await service.submitReview("user_thomas", submission);
    await expect(
      service.replyToReview("user_camille", review.id, { comment: "Merci." }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("helpful votes", () => {
  it("counts each reader once, idempotently, and tells the reader their vote back", async () => {
    const { service } = setup();
    const review = await service.submitReview("user_thomas", submission);
    await expect(
      service.markHelpful("user_lucas", review.id, { helpful: true }),
    ).resolves.toEqual({
      reviewId: review.id,
      helpfulCount: 1,
      viewerMarkedHelpful: true,
    });
    await expect(
      service.markHelpful("user_lucas", review.id, { helpful: true }),
    ).resolves.toMatchObject({ helpfulCount: 1 });
    await expect(
      service.markHelpful("user_marion", review.id, { helpful: true }),
    ).resolves.toMatchObject({ helpfulCount: 2 });
    const [asLucas] = await service.getUserReviews(
      "user_camille",
      "user_lucas",
    );
    expect(asLucas).toMatchObject({
      helpfulCount: 2,
      viewerMarkedHelpful: true,
    });
    const [anonymous] = await service.getUserReviews("user_camille");
    expect(anonymous.helpfulCount).toBe(2);
    expect(anonymous).not.toHaveProperty("viewerMarkedHelpful");
    await expect(
      service.markHelpful("user_lucas", review.id, { helpful: false }),
    ).resolves.toMatchObject({ helpfulCount: 1, viewerMarkedHelpful: false });
  });

  it("refuses the review's author and recipient", async () => {
    const { service } = setup();
    const review = await service.submitReview("user_thomas", submission);
    for (const participant of ["user_thomas", "user_camille"]) {
      await expect(
        service.markHelpful(participant, review.id, { helpful: true }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});

describe("review reminders", () => {
  const now = new Date("2026-09-10T09:00:00Z");

  it("reminds each participant once, only inside the window, never after a review", async () => {
    const tooRecent: OrderRecord = {
      ...completedOrder,
      id: "fresh-order",
      completedAt: "2026-09-09T12:00:00Z",
    };
    const tooOld: OrderRecord = {
      ...completedOrder,
      id: "stale-order",
      completedAt: "2026-08-01T12:00:00Z",
    };
    const { reviews, orders, users, listings, service } = setup({
      [tooRecent.id]: tooRecent,
      [tooOld.id]: tooOld,
    });
    await service.submitReview("user_thomas", submission);
    const dispatch = vi
      .spyOn(notificationsService, "dispatchNotification")
      .mockResolvedValue({} as never);
    try {
      const worker = new ReviewReminderWorker(orders, reviews, users, listings);
      await expect(worker.run(now)).resolves.toEqual({
        reminded: 1,
        skipped: 1,
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0]?.[0]).toBe("user_camille");
      expect(dispatch.mock.calls[0]?.[1]).toBe("review_reminder");
      expect(dispatch.mock.calls[0]?.[4]).toBe(
        "/compte/achats?transactionId=review-order",
      );
      expect(dispatch.mock.calls[0]?.[5]).toBe("reviews");
      // A second pass finds the reminder already recorded.
      await expect(worker.run(now)).resolves.toEqual({
        reminded: 0,
        skipped: 2,
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
    } finally {
      dispatch.mockRestore();
    }
  });
});
