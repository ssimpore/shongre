import { describe, expect, it } from "vitest";
import {
  MONETIZATION_ADMIN_CONSTRAINTS,
  commercialChangeReasonSchema,
  complimentaryGrantDecisionInputSchema,
  complimentaryGrantRequestInputSchema,
} from "../src/schemas/monetization";

describe("monetization administration constraints", () => {
  it("uses the same audited reason policy for drafts and transitions", () => {
    expect(commercialChangeReasonSchema.safeParse("court").success).toBe(false);
    expect(
      commercialChangeReasonSchema.safeParse(
        "x".repeat(MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength),
      ).success,
    ).toBe(true);
  });

  it("validates complimentary requests, including their effective period", () => {
    const base = {
      accountId: "account-1",
      productVersionId: "product-v1",
      reason: "Attribution partenaire documentée",
      startsAt: "2026-08-25T10:00:00.000Z",
      endsAt: "2026-09-25T10:00:00.000Z",
      idempotencyKey: "complimentary-request-1",
    };

    expect(complimentaryGrantRequestInputSchema.safeParse(base).success).toBe(
      true,
    );
    expect(
      complimentaryGrantRequestInputSchema.safeParse({
        ...base,
        endsAt: base.startsAt,
      }).success,
    ).toBe(false);
  });

  it("rejects an unaudited complimentary decision", () => {
    expect(
      complimentaryGrantDecisionInputSchema.safeParse({
        decision: "approved",
        reason: "court",
        idempotencyKey: "complimentary-decision-1",
      }).success,
    ).toBe(false);
  });
});
