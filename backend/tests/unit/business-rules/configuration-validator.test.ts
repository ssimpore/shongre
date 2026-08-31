import { describe, expect, it } from "vitest";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { PROPOSED_MONETIZATION_DRAFT_CATALOG } from "@shongre/contracts/monetization-proposed-catalog";
import { validateCommercialConfiguration } from "../../../src/modules/business-rules/configuration-validator.js";

describe("commercial configuration validation", () => {
  it("keeps the historical baseline readable while blocking a new publication without live provider mappings", () => {
    const conflicts = validateCommercialConfiguration(
      BASELINE_MONETIZATION_CATALOG,
    );
    expect(conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SUBSCRIPTION_TRANSITION_POLICY_INCOMPLETE",
          severity: "blocking",
        }),
        expect.objectContaining({
          code: "SUBSCRIPTION_PROVIDER_PRICE_MAPPING_MISSING",
          severity: "blocking",
        }),
      ]),
    );
    expect(
      conflicts.some(
        (conflict) => conflict.code === "FEATURE_COMMERCIAL_PROMISE_SUSPENDED",
      ),
    ).toBe(true);
  });

  it("keeps the proposed target blocked until shadow quotes, economics, campaign dates and provider mappings are approved", () => {
    const codes = validateCommercialConfiguration(
      PROPOSED_MONETIZATION_DRAFT_CATALOG,
    ).map((conflict) => conflict.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "MIGRATION_SHADOW_QUOTE_INCOMPLETE",
        "CAMPAIGN_ENROLLMENT_WINDOW_MISSING",
        "ECONOMICS_APPROVAL_REQUIRED",
        "PROVIDER_MAPPING_NOT_SYNCHRONIZED",
        "SUBSCRIPTION_TRANSITION_POLICY_INCOMPLETE",
        "SUBSCRIPTION_PROVIDER_PRICE_MAPPING_MISSING",
      ]),
    );
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

  it("blocks an incomplete feature from being commercially re-enabled", () => {
    const catalog = structuredClone(BASELINE_MONETIZATION_CATALOG);
    const feature = catalog.products
      .find((product) => product.id === "auto.dealer.growth")!
      .entitlements.find(
        (entitlement) => entitlement.key === "inventoryCsvImport",
      )!;
    feature.availability = "enabled";

    expect(validateCommercialConfiguration(catalog)).toContainEqual(
      expect.objectContaining({
        code: "FEATURE_NOT_IMPLEMENTED",
        severity: "blocking",
      }),
    );
  });

  it("blocks an operational feature whose declared dependency is unavailable", () => {
    const catalog = structuredClone(BASELINE_MONETIZATION_CATALOG);
    const product = catalog.products.find(
      (entry) => entry.id === "auto.dealer.growth",
    )!;
    const feature = product.entitlements.find(
      (entitlement) => entitlement.key === "maxActiveVehicles",
    )!;
    feature.dependencies = ["inventoryCsvImport"];

    expect(validateCommercialConfiguration(catalog)).toContainEqual(
      expect.objectContaining({
        code: "FEATURE_DEPENDENCY_MISSING",
        severity: "blocking",
      }),
    );
  });

  it("blocks ambiguous commission rules at identical precedence", () => {
    const catalog = structuredClone(BASELINE_MONETIZATION_CATALOG);
    const source = catalog.commissionPolicies[0];
    const conflicting = structuredClone(source);
    conflicting.id = "commission-policy-conflict";
    conflicting.code = "commission.conflict";
    conflicting.rules[0].id = "commission-rule-conflict";
    conflicting.rules[0].policyId = conflicting.id;
    if (conflicting.rules[0].effect.kind === "commission") {
      conflicting.rules[0].effect.model = {
        type: "percentage",
        rateBps: 900,
      };
    }
    catalog.commissionPolicies.push(conflicting);

    expect(validateCommercialConfiguration(catalog)).toContainEqual(
      expect.objectContaining({
        code: "AMBIGUOUS_COMMISSION_PRECEDENCE",
        severity: "blocking",
      }),
    );
  });
});
