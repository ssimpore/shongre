import { describe, expect, it } from "vitest";
import {
  normalizeBusinessVerticalCode,
  normalizeBusinessVerticalFamilyId,
  normalizeEducationEntitlementKey,
  normalizeFinanceCategory,
} from "./business-verticals";

describe("Education business vertical compatibility", () => {
  it("normalizes the legacy Cours dimension without changing course entities", () => {
    expect(normalizeBusinessVerticalCode("cours")).toBe("education");
    expect(normalizeBusinessVerticalCode("education")).toBe("education");
    expect(normalizeBusinessVerticalCode("course")).toBe("course");
  });

  it("normalizes commercial family and finance aliases", () => {
    expect(normalizeBusinessVerticalFamilyId("vertical.cours")).toBe(
      "vertical.education",
    );
    expect(normalizeBusinessVerticalFamilyId("vertical.cours.legacy")).toBe(
      "vertical.education.legacy",
    );
    expect(normalizeFinanceCategory("courses_subscription")).toBe(
      "education_subscription",
    );
    expect(normalizeEducationEntitlementKey("cours.instructors.max")).toBe(
      "education.instructors.max",
    );
    expect(normalizeEducationEntitlementKey("maxActiveOffers")).toBe(
      "maxActiveOffers",
    );
  });
});
