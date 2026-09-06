import { describe, expect, it } from "vitest";
import { tutorSearchItemSchema } from "./courses";

const resolvedPromotion = {
  state: "active" as const,
  type: "sponsored_search" as const,
  marketCode: "FR",
  source: "purchase" as const,
  sourceId: "promotion-proof-course",
  label: "Sponsorisé",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-10-01T00:00:00.000Z",
};

describe("course tutor search promotion contract", () => {
  it("exposes exact market, evidence source and schedule proof", () => {
    expect(
      tutorSearchItemSchema.shape.resolvedPromotion
        .unwrap()
        .parse(resolvedPromotion),
    ).toEqual(resolvedPromotion);
  });

  it("rejects incomplete or reversed promotion proof", () => {
    expect(
      tutorSearchItemSchema.shape.resolvedPromotion.unwrap().safeParse({
        ...resolvedPromotion,
        sourceId: "",
      }).success,
    ).toBe(false);
    expect(
      tutorSearchItemSchema.shape.resolvedPromotion.unwrap().safeParse({
        ...resolvedPromotion,
        startsAt: resolvedPromotion.endsAt,
        endsAt: resolvedPromotion.startsAt,
      }).success,
    ).toBe(false);
  });
});
