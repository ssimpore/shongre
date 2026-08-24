import { describe, expect, it } from "vitest";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { resolveEffectiveEntitlementsForVertical } from "./effective-entitlements";

describe("Education entitlement compatibility", () => {
  it("resolves legacy vertical IDs and prefixed keys into one canonical grant", () => {
    const resolved = resolveEffectiveEntitlementsForVertical({
      catalog: BASELINE_MONETIZATION_CATALOG,
      verticalId: "education",
      at: new Date("2026-08-24T12:00:00.000Z"),
      entitlements: [
        {
          id: "legacy-course-seat-grant",
          accountId: "account-1",
          productId: "course.tutor.premium",
          key: "cours.instructors.max",
          value: 5,
          startsAt: "2026-08-01T00:00:00.000Z",
          status: "active",
          verticalId: "cours",
        },
      ],
    });

    expect(resolved).toContainEqual(
      expect.objectContaining({
        key: "education.instructors.max",
        value: 5,
        verticalId: "education",
      }),
    );
  });
});
