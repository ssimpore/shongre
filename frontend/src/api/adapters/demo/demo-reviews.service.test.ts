import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoReviewsService } from "./demo-reviews.service";
import { storageService } from "../../../services/storage.service";
import {
  INITIAL_REVIEWS,
  INITIAL_TRANSACTIONS,
} from "../../../mocks/initialDemoData";

const service = new DemoReviewsService();
const input = {
  transactionId: "review-test-order",
  rating: 4,
  comment: "Très bonne communication, merci.",
};
beforeEach(() => {
  storageService.remove("shongre_transaction_reviews_v1");
  storageService.setCurrentUserKey("seller_camille");
  storageService.set("shongre_transactions_v1", [
    ...structuredClone(INITIAL_TRANSACTIONS),
    {
      ...structuredClone(
        INITIAL_TRANSACTIONS.find((order) => order.id === "tx-903")!,
      ),
      id: input.transactionId,
      reviewId: undefined,
    },
  ]);
});
afterEach(() => {
  vi.restoreAllMocks();
  storageService.remove("shongre_transaction_reviews_v1");
  storageService.remove("shongre_transactions_v1");
  storageService.setCurrentUserKey("guest");
});

describe("demo transaction reviews", () => {
  it("does not replay an in-flight review into a newly selected account", async () => {
    const pending = service.submitReview(input);
    storageService.setCurrentUserKey("pro_atelier");
    await expect(pending).rejects.toThrow(/compte actif a changé/);
    expect(
      storageService.getOrderReview(input.transactionId, "user_camille"),
    ).toBeNull();
    expect(
      storageService.getOrderReview(input.transactionId, "user_pro_atelier"),
    ).toBeNull();
  });

  it("does not confirm a review when storage failed", async () => {
    vi.spyOn(storageService, "set").mockImplementation(() => undefined);
    await expect(service.submitReview(input)).rejects.toThrow(
      /n’a pas pu être enregistré/,
    );
  });

  it("persists a verified review without mutating fixture arrays", async () => {
    const initial = JSON.stringify(INITIAL_REVIEWS);
    await expect(
      service.getOrderEligibility(input.transactionId),
    ).resolves.toMatchObject({ eligible: true });
    const review = await service.submitReview(input);
    expect(review).toMatchObject({
      authorId: "user_camille",
      targetUserId: "user_pro_atelier",
      verifiedTransaction: true,
      reviewerRole: "buyer",
    });
    expect(review).not.toHaveProperty("orderId");
    await expect(
      new DemoReviewsService().getOrderEligibility(input.transactionId),
    ).resolves.toMatchObject({
      eligible: false,
      reason: "ALREADY_REVIEWED",
      review,
    });
    await expect(service.submitReview(input)).rejects.toThrow(/déjà/);
    expect(JSON.stringify(INITIAL_REVIEWS)).toBe(initial);
  });

  it("derives the other participant after an account switch", async () => {
    await service.submitReview(input);
    storageService.setCurrentUserKey("pro_atelier");
    await expect(
      service.getOrderEligibility(input.transactionId),
    ).resolves.toMatchObject({ eligible: true });
    await expect(service.submitReview(input)).resolves.toMatchObject({
      authorId: "user_pro_atelier",
      targetUserId: "user_camille",
      reviewerRole: "seller",
    });
  });

  it("recognizes reviews already bound in the deterministic snapshot", async () => {
    await expect(service.getOrderEligibility("tx-903")).resolves.toMatchObject({
      eligible: false,
      reason: "ALREADY_REVIEWED",
    });
    await expect(
      service.submitReview({ ...input, transactionId: "tx-903" }),
    ).rejects.toThrow(/déjà/);
  });

  it("rejects unrelated accounts and incomplete transactions", async () => {
    storageService.setCurrentUserKey("buyer_thomas");
    await expect(
      service.getOrderEligibility(input.transactionId),
    ).rejects.toThrow(/introuvable/);
    await expect(
      service.submitReview({ ...input, transactionId: "tx-901" }),
    ).rejects.toThrow(/terminée/);
  });

  it("does not expose private order identifiers in public review collections", async () => {
    const reviews = await service.getUserReviews("user_pro_atelier");
    expect(reviews.length).toBeGreaterThan(0);
    for (const review of reviews) expect(review).not.toHaveProperty("orderId");
  });
});
