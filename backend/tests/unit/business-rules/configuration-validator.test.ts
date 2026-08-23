import { describe, expect, it } from "vitest";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { validateCommercialConfiguration } from "../../../src/modules/business-rules/configuration-validator.js";

describe("commercial configuration validation", () => {
  it("accepts the audited baseline without conflicts", () => {
    expect(
      validateCommercialConfiguration(BASELINE_MONETIZATION_CATALOG),
    ).toEqual([]);
  });

  it("blocks ambiguous rules with identical precedence and divergent outcomes", () => {
    const source = BASELINE_MONETIZATION_CATALOG.rules[0];
    const catalog = structuredClone(BASELINE_MONETIZATION_CATALOG);
    catalog.rules.push({
      ...structuredClone(source),
      id: "listing.individual.standard.conflict",
      key: "listing.individual.standard.conflict",
      outcome: {
        ...source.outcome,
        quotaLimit: Number(source.outcome.quotaLimit) + 1,
      },
    });
    expect(validateCommercialConfiguration(catalog)).toContainEqual(
      expect.objectContaining({
        code: "AMBIGUOUS_RULE_PRECEDENCE",
        severity: "blocking",
      }),
    );
  });

  it("blocks invalid product references and percentage discounts over 100 percent", () => {
    const catalog = structuredClone(BASELINE_MONETIZATION_CATALOG);
    catalog.products[0].compatibility.requiresProductIds = ["missing-product"];
    catalog.promotions[0].discountValue = 10_001;
    const conflicts = validateCommercialConfiguration(catalog);
    expect(conflicts.map((conflict) => conflict.code)).toEqual(
      expect.arrayContaining([
        "UNKNOWN_PRODUCT_REFERENCE",
        "INVALID_PERCENTAGE_DISCOUNT",
      ]),
    );
  });
});
