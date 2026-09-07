import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  REVIEW_CONSTRAINTS,
  transactionReviewInputSchema,
} from "@shongre/contracts/reviews";

const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

describe("transaction review transport contract", () => {
  it("keeps runtime and UI validation aligned with OpenAPI", () => {
    const schema = specification.components.schemas.SubmitTransactionReview;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["transactionId", "rating", "comment"]);
    expect(schema.properties.transactionId.maxLength).toBe(
      REVIEW_CONSTRAINTS.transactionIdMaxLength,
    );
    expect(schema.properties.rating.minimum).toBe(REVIEW_CONSTRAINTS.ratingMin);
    expect(schema.properties.rating.maximum).toBe(REVIEW_CONSTRAINTS.ratingMax);
    expect(schema.properties.comment.minLength).toBe(
      REVIEW_CONSTRAINTS.commentMinLength,
    );
    expect(schema.properties.comment.maxLength).toBe(
      REVIEW_CONSTRAINTS.commentMaxLength,
    );
    expect(
      transactionReviewInputSchema.safeParse({
        transactionId: "order-1",
        rating: 5,
        comment: "Useful feedback",
        authorId: "forged",
      }).success,
    ).toBe(false);
  });

  it("requires review permission for eligibility and submission", () => {
    for (const operation of [
      specification.paths["/orders/{id}/review"].get,
      specification.paths["/reviews/submit"].post,
    ]) {
      expect(operation["x-shongre-permission"]).toBe("review.create");
      expect(operation.security).toEqual(
        expect.arrayContaining([{ CookieAuth: [] }, { BearerAuth: [] }]),
      );
    }
  });

  it("keeps private purchase IDs out of the public review projection", () => {
    const schema = specification.components.schemas.MarketplaceReview;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain("verifiedTransaction");
    expect(schema.properties.orderId).toBeUndefined();
    expect(schema.properties.transactionId).toBeUndefined();
  });
});
