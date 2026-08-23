import { describe, expect, it } from "vitest";
import { DEFAULT_EMPLOYMENT_CATALOG } from "../fixtures/employment-catalog";
import {
  employmentCatalogSchema,
  jobPostingDetailSchema,
  salaryRangeSchema,
} from "./employment";

describe("employment contracts", () => {
  it("keeps the canonical jobs taxonomy and a free employer path", () => {
    const catalog = employmentCatalogSchema.parse(DEFAULT_EMPLOYMENT_CATALOG);

    expect(catalog.activation.verticalType).toBe("employment");
    expect(catalog.activation.categoryIds).toEqual(["jobs"]);
    expect(catalog.config.featureFlags.privateEmployersEnabled).toBe(true);
    expect(
      catalog.offers.some(
        (offer) =>
          offer.kind === "free" &&
          offer.prices.some((price) => price.amount.amountMinor === 0),
      ),
    ).toBe(true);
    expect(catalog.offers.every((offer) => offer.id !== "employment.visibility.pack" || !offer.isRecommended)).toBe(true);
  });

  it("rejects reversed and mixed-currency salary ranges", () => {
    const base = {
      frequencyId: "employment.fr.salary_frequency.year",
      presentationId: "gross",
      isPublic: true,
    };
    expect(
      salaryRangeSchema.safeParse({
        ...base,
        minimum: { amountMinor: 45_000_00, currency: "EUR" },
        maximum: { amountMinor: 55_000_00, currency: "EUR" },
      }).success,
    ).toBe(true);
    expect(
      salaryRangeSchema.safeParse({
        ...base,
        minimum: { amountMinor: 60_000_00, currency: "EUR" },
        maximum: { amountMinor: 55_000_00, currency: "EUR" },
      }).success,
    ).toBe(false);
    expect(
      salaryRangeSchema.safeParse({
        ...base,
        minimum: { amountMinor: 45_000_00, currency: "EUR" },
        maximum: { amountMinor: 55_000_00, currency: "CHF" },
      }).success,
    ).toBe(false);
  });

  it("makes candidate fees impossible in the public job contract", () => {
    const result = jobPostingDetailSchema.safeParse({ candidateFeeRequired: true });
    expect(result.success).toBe(false);
  });
});
