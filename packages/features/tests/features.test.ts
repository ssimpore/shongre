import { describe, expect, it } from "vitest";
import { getListingPromotionBadges, resolveNotificationTone } from "../src";

describe("shared feature presentation", () => {
  it("marks paid placement transparently on every platform", () => {
    expect(
      getListingPromotionBadges({ isUrgent: false, isFeatured: true }),
    ).toEqual([
      { label: "À la une · sponsorisé", tone: "featured", sponsored: true },
    ]);
  });
  it("uses one notification tone mapping", () => {
    expect(resolveNotificationTone("listing_rejected")).toBe("error");
  });
});
