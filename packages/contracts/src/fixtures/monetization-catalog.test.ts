import { describe, expect, it } from "vitest";
import type { MonetizationProduct } from "../schemas/monetization";
import {
  isCommercialAudienceCompatible,
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "../schemas/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "./monetization-catalog";
import { normalizeEducationMonetizationCatalog } from "../business-verticals";

const catalog = BASELINE_MONETIZATION_CATALOG;

function product(id: string): MonetizationProduct {
  const match = catalog.products.find((entry) => entry.id === id);
  expect(match, `missing catalog product ${id}`).toBeDefined();
  return match!;
}

function numericEntitlements(id: string) {
  return Object.fromEntries(
    product(id)
      .entitlements.filter((entry) => typeof entry.value === "number")
      .map((entry) => [entry.key, entry.value]),
  );
}

function expectPrices(id: string, month: number, year?: number) {
  const prices = Object.fromEntries(
    product(id).prices.map((entry) => [
      entry.billingPeriod,
      entry.amount.amountMinor,
    ]),
  );
  expect(prices).toEqual(year === undefined ? { month } : { month, year });
}

function expectOneTimePrice(id: string, amountMinor: number) {
  expect(product(id).prices).toHaveLength(1);
  expect(product(id).prices[0]).toMatchObject({
    billingPeriod: "once",
    amount: { amountMinor },
  });
}

describe("commercial-fr-v3 default catalog", () => {
  it("treats organizations as professional accounts without opening org-only plans", () => {
    expect(isCommercialAudienceCompatible("professional", "organization")).toBe(
      true,
    );
    expect(isCommercialAudienceCompatible("organization", "professional")).toBe(
      false,
    );
    expect(isCommercialAudienceCompatible("individual", "organization")).toBe(
      false,
    );
  });

  it("publishes one canonical active professional plan family per vertical", () => {
    const activePlans = catalog.products.filter(
      (entry) =>
        entry.status === "active" &&
        entry.kind === "subscription" &&
        entry.commercialProfile.professionalOnly,
    );

    expect(catalog.configurationVersionId).toBe("commercial-fr-v3");
    expect(catalog.versionNumber).toBe(3);
    expect(activePlans).toHaveLength(16);
    expect(
      activePlans.reduce<Record<string, number>>((totals, entry) => {
        const key = entry.commercialProfile.verticalId || "general";
        totals[key] = (totals[key] || 0) + 1;
        return totals;
      }, {}),
    ).toEqual({ general: 2, auto: 3, education: 4, immo: 3, emploi: 4 });
    expect(
      catalog.products.filter(
        (entry) =>
          entry.id.startsWith("course.training.") && entry.status === "active",
      ),
    ).toHaveLength(0);
  });

  it("presents Education once while retaining stable course product identities", () => {
    expect(
      catalog.verticals.filter((vertical) => vertical.id === "education"),
    ).toHaveLength(1);
    expect(catalog.verticals.some((vertical) => vertical.id === "cours")).toBe(
      false,
    );
    expect(product("course.tutor.pro").name).toBe("Shongre Education Pro");
    expect(product("course.tutor.premium").name).toBe(
      "Shongre Education Studio",
    );
    expect(product("course.school.organization").name).toBe(
      "Shongre Education Organisme",
    );
    expect(product("course.tutor.pro").commercialProfile).toMatchObject({
      familyId: "vertical.education",
      verticalId: "education",
      financeCategory: "education_subscription",
    });
  });

  it("projects an immutable legacy snapshot without changing its version identity", () => {
    const legacy = structuredClone(catalog);
    const education = legacy.verticals.find(
      (vertical) => vertical.id === "education",
    )!;
    education.id = "cours";
    education.name = "Cours";
    const plan = legacy.products.find(
      (candidate) => candidate.id === "course.tutor.premium",
    )!;
    plan.name = "Shongre Cours Studio";
    plan.commercialProfile.verticalId = "cours";
    plan.commercialProfile.familyId = "vertical.cours";
    plan.commercialProfile.financeCategory = "courses_subscription";

    const projected = normalizeEducationMonetizationCatalog(legacy);
    expect(projected.configurationVersionId).toBe(
      legacy.configurationVersionId,
    );
    expect(
      projected.verticals.some((vertical) => vertical.id === "cours"),
    ).toBe(false);
    expect(
      projected.products.find(
        (candidate) => candidate.id === "course.tutor.premium",
      ),
    ).toMatchObject({
      id: "course.tutor.premium",
      name: "Shongre Education Studio",
      commercialProfile: {
        verticalId: "education",
        familyId: "vertical.education",
        financeCategory: "education_subscription",
      },
    });
  });

  it("seeds exact generic, Auto and Immo prices and capacity quotas", () => {
    expectPrices("plan.pro.free", 0);
    expectPrices("plan.pro.business", 1_990, 19_900);
    expect(numericEntitlements("plan.pro.business")).toMatchObject({
      maxActiveListings: 50,
      maxMonthlyPublications: 100,
      maxPhotosPerListing: 15,
      teamMembers: 1,
      monthlyBumpCredits: 1,
    });

    for (const [
      id,
      month,
      year,
      active,
      monthly,
      photos,
      seats,
      locations,
      credits,
    ] of [
      ["auto.dealer.starter", 2_990, 29_900, 20, 30, 15, 1, 1, 1],
      ["auto.dealer.growth", 5_990, 59_900, 80, 150, 25, 3, 2, 5],
      ["auto.dealer.network", 11_990, 119_900, 250, 500, 40, 10, 5, 15],
    ] as const) {
      expectPrices(id, month, year);
      expect(numericEntitlements(id)).toMatchObject({
        maxActiveVehicles: active,
        maxMonthlyPublications: monthly,
        maxPhotosPerVehicle: photos,
        maxTeamMembers: seats,
        maxLocations: locations,
        monthlyPromotionCredits: credits,
      });
      expect(product(id).commercialProfile.trialPolicy.durationDays).toBe(30);
    }

    for (const [
      id,
      month,
      year,
      active,
      monthly,
      media,
      seats,
      locations,
      credits,
    ] of [
      ["immo.agency.starter", 2_990, 29_900, 15, 30, 20, 1, 1, 1],
      ["immo.agency.growth", 6_990, 69_900, 75, 150, 35, 5, 2, 5],
      ["immo.agency.network", 12_990, 129_900, 250, 500, 50, 15, 10, 15],
    ] as const) {
      expectPrices(id, month, year);
      expect(numericEntitlements(id)).toMatchObject({
        maxActiveListings: active,
        maxMonthlyPublications: monthly,
        maxMedia: media,
        maxTeamMembers: seats,
        maxLocations: locations,
        monthlyPromotionCredits: credits,
      });
      expect(product(id).commercialProfile.trialPolicy.durationDays).toBe(30);
    }
  });

  it("seeds exact Emploi and Education prices and capacity quotas", () => {
    for (const [id, month, year, active, monthly, seats, credits] of [
      ["employment.employer.free", 0, undefined, 1, 3, 1, undefined],
      ["employment.employer.starter", 1_990, 19_900, 5, 10, 2, 1],
      ["employment.employer.growth", 4_990, 49_900, 20, 40, 5, 5],
      ["employment.agency", 9_990, 99_900, 75, 150, 15, 15],
    ] as const) {
      expectPrices(id, month, year);
      expect(numericEntitlements(id)).toMatchObject({
        maxActiveJobs: active,
        maxMonthlyPublications: monthly,
        maxRecruiterSeats: seats,
        ...(credits === undefined ? {} : { includedPromotionCredits: credits }),
      });
    }

    for (const [id, month, year, active, photos, instructors, credits] of [
      ["course.tutor.free", 0, undefined, 3, 8, 1, undefined],
      ["course.tutor.pro", 790, 7_900, 15, 15, 1, 1],
      ["course.tutor.premium", 2_490, 24_900, 50, 25, 5, 5],
      ["course.school.organization", 5_990, 59_900, 200, 40, 20, 15],
    ] as const) {
      expectPrices(id, month, year);
      expect(numericEntitlements(id)).toMatchObject({
        maxActiveOffers: active,
        maxPhotosPerCourse: photos,
        teamMembers: instructors,
        ...(credits === undefined ? {} : { visibilityCreditsMonthly: credits }),
      });
    }
  });

  it("keeps recommended tiers and launch trials configuration-driven", () => {
    expect(
      catalog.products
        .filter(
          (entry) =>
            entry.status === "active" &&
            entry.kind === "subscription" &&
            entry.recommended,
        )
        .map((entry) => entry.id),
    ).toEqual([
      "plan.pro.business",
      "auto.dealer.growth",
      "course.tutor.premium",
      "immo.agency.growth",
      "employment.employer.growth",
    ]);
    expect(
      catalog.products
        .filter(
          (entry) =>
            entry.status === "active" &&
            entry.kind === "subscription" &&
            Boolean(entry.commercialProfile.verticalId) &&
            entry.prices.some((price) => price.amount.amountMinor > 0),
        )
        .every(
          (entry) =>
            entry.commercialProfile.trialPolicy.enabled &&
            entry.commercialProfile.trialPolicy.durationDays === 30,
        ),
    ).toBe(true);
  });

  it("models the Auto Founding Pros campaign as two explicit billing phases", () => {
    const campaign = catalog.promotions.find(
      (promotion) => promotion.code === "AUTO2026",
    );

    expect(campaign).toMatchObject({
      name: "Lancement Auto — Founding Pros",
      discountType: "percentage",
      discountValue: 5_000,
      freePeriodDays: 90,
      durationBillingPeriods: 3,
      eligibleCustomerType: "new",
      stackingPolicy: "exclusive",
    });
    expect(campaign?.productIds).toEqual([
      "auto.dealer.starter",
      "auto.dealer.growth",
      "auto.dealer.network",
    ]);
  });

  it("derives each plan add-on compatibility from the same vertical catalog", () => {
    expect(
      product("auto.dealer.growth").commercialProfile.compatibleAddonIds,
    ).toEqual(
      expect.arrayContaining([
        "auto_addon_bump",
        "auto_addon_featured",
        "auto_addon_bump_pack_10",
      ]),
    );
    expect(
      product("immo.agency.growth").commercialProfile.compatibleAddonIds,
    ).toEqual(
      expect.arrayContaining([
        "immo_bump",
        "immo_featured",
        "immo_bump_pack_10",
      ]),
    );
    expect(
      product("employment.employer.growth").commercialProfile
        .compatibleAddonIds,
    ).toContain("employment.addon.seat");
    expect(
      product("course.tutor.premium").commercialProfile.compatibleAddonIds,
    ).toContain("addon_search_bump");
    expect(
      product("auto.dealer.growth").commercialProfile.compatibleAddonIds,
    ).not.toContain("immo_bump");
  });

  it("seeds exact general and Auto/Immo listing-promotion prices", () => {
    for (const [id, amount] of [
      ["premium.search_bump", 190],
      ["premium.urgent", 390],
      ["premium.spotlight", 790],
      ["premium.highlight", 1_990],
      ["premium.visibility_bundle", 1_490],
      ["auto_addon_bump", 490],
      ["auto_addon_urgent", 790],
      ["auto_addon_featured", 1_490],
      ["auto_addon_featured_30d", 3_990],
      ["auto_addon_bump_pack_10", 3_490],
      ["immo_bump", 490],
      ["immo_urgent", 790],
      ["immo_featured", 1_490],
      ["immo_featured_30d", 3_990],
      ["immo_bump_pack_10", 3_490],
    ] as const) {
      expectOneTimePrice(id, amount);
    }
  });

  it("keeps incomplete paid promises configured but commercially suspended", () => {
    const csvImport = product("auto.dealer.growth").entitlements.find(
      (entry) => entry.key === "inventoryCsvImport",
    );

    expect(csvImport).toMatchObject({
      availability: "maintenance",
      implementationStatus: "incomplete",
      dependencies: [],
    });
    expect(isCommercialEntitlementOperational(csvImport!)).toBe(false);
    expect(
      catalog.products
        .filter((entry) => entry.status === "active")
        .flatMap((entry) => entry.entitlements)
        .some(
          (entry) =>
            entry.implementationStatus !== "ready" &&
            ["enabled", "beta"].includes(entry.availability),
        ),
    ).toBe(false);
    expect(
      isCommercialProductPurchasable(product("premium.visibility_bundle")),
    ).toBe(false);
    expect(isCommercialProductPurchasable(product("premium.urgent"))).toBe(
      true,
    );
    expect(isCommercialProductPurchasable(product("auto.dealer.growth"))).toBe(
      true,
    );
  });

  it("does not advertise suspended capabilities in active plan descriptions", () => {
    const forbiddenCopy: Record<string, RegExp> = {
      "auto.dealer.growth": /\béquipe\b|\bimports?\b/i,
      "auto.dealer.network":
        /multi-sites|synchronisation|\bexports?\b|\bapi\b/i,
      "immo.agency.growth": /\béquipe\b|\bimports?\b/i,
      "immo.agency.network": /multi-agences|\bflux\b|reporting|\bapi\b/i,
      "course.tutor.premium": /catalogue|\béquipe\b/i,
      "course.school.organization":
        /catalogue|\béquipe\b|\bimports?\b|reporting|\bapi\b/i,
    };

    for (const [productId, forbidden] of Object.entries(forbiddenCopy)) {
      expect(product(productId).description).not.toMatch(forbidden);
    }
    expect(
      product("auto.dealer.network").entitlements.find(
        (entry) => entry.key === "publicStorefront",
      )?.label,
    ).toBe("Vitrine concession");
  });
});
