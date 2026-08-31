import { describe, expect, it } from "vitest";
import { monetizationCatalogSchema } from "../schemas/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "./monetization-catalog";
import { PROPOSED_MONETIZATION_DRAFT_CATALOG } from "./monetization-proposed-catalog";

const draft = PROPOSED_MONETIZATION_DRAFT_CATALOG;

const price = (productId: string, billingPeriod: "once" | "month" | "year") =>
  draft.products
    .find((product) => product.id === productId)!
    .prices.find((entry) => entry.billingPeriod === billingPeriod)!.amount
    .amountMinor;

describe("commercial-fr-v4 proposed draft", () => {
  it("is a valid new snapshot and leaves commercial-fr-v3 unchanged", () => {
    expect(monetizationCatalogSchema.safeParse(draft).success).toBe(true);
    expect(draft.configurationVersionId).toBe("commercial-fr-v4-draft");
    expect(BASELINE_MONETIZATION_CATALOG.configurationVersionId).toBe(
      "commercial-fr-v3",
    );
    expect(
      BASELINE_MONETIZATION_CATALOG.products.some((product) =>
        product.id.startsWith("pro.target."),
      ),
    ).toBe(false);
  });

  it("seeds explicit monthly and annual target plan prices", () => {
    expect(price("pro.target.starter", "month")).toBe(1_990);
    expect(price("pro.target.starter", "year")).toBe(19_900);
    expect(price("pro.target.growth", "month")).toBe(4_990);
    expect(price("pro.target.growth", "year")).toBe(49_900);
    expect(price("pro.target.performance", "month")).toBe(11_690);
    expect(price("pro.target.performance", "year")).toBe(116_900);
  });

  it("maps every currently selectable professional plan without silent migration", () => {
    const selectablePlans = BASELINE_MONETIZATION_CATALOG.products.filter(
      (product) =>
        product.status === "active" &&
        product.kind === "subscription" &&
        product.commercialProfile.professionalOnly,
    );
    expect(draft.migrationMappings).toHaveLength(selectablePlans.length);
    expect(
      draft.migrationMappings.every(
        (mapping) =>
          mapping.treatment === "customer_choice_required" &&
          mapping.requiresCustomerAcceptance &&
          mapping.preserveHistoricalPrice &&
          mapping.preserveHistoricalEntitlements &&
          mapping.shadowQuoteStatus === "not_run",
      ),
    ).toBe(true);
  });

  it("configures the founding campaign and its finite twelve-month price lock", () => {
    expect(draft.campaigns).toContainEqual(
      expect.objectContaining({
        id: "campaign-founding-professional",
        trialDays: 90,
        maximumVerticals: 1,
        conversionBehavior: "customer_selected_plan",
        priceProtectionPolicyId: "price-lock-founding-professional-12m",
      }),
    );
    expect(draft.priceProtectionPolicies).toContainEqual(
      expect.objectContaining({
        id: "price-lock-founding-professional-12m",
        durationMonths: 12,
        startsWhen: "paid_subscription_starts",
        preservePriceId: true,
      }),
    );
  });

  it("keeps provider-dependent offers fail closed and carries no invented provider id", () => {
    const deferred = draft.products.filter((product) =>
      [
        "vehicle.secure-payment.v4",
        "vehicle.protection.v4",
        "tenant.premium-pass.v4",
        "vehicle.valuation-report.v4",
      ].includes(product.id),
    );
    expect(deferred.every((product) => product.status === "disabled")).toBe(
      true,
    );
    expect(
      deferred
        .flatMap((product) => product.entitlements)
        .every(
          (entry) =>
            entry.availability === "maintenance" &&
            entry.implementationStatus === "external_dependency",
        ),
    ).toBe(true);
    expect(
      draft.providerMappings.every(
        (mapping) =>
          mapping.synchronizationStatus === "missing" &&
          mapping.externalReferenceId === undefined,
      ),
    ).toBe(true);
  });

  it("configures exact target visibility amounts with organic isolation", () => {
    expect(price("visibility.bump.v4", "once")).toBe(99);
    expect(price("visibility.featured.3d.v4", "once")).toBe(199);
    expect(price("visibility.featured.7d.v4", "once")).toBe(490);
    expect(price("visibility.refresh.7d.v4", "once")).toBe(390);
    expect(price("visibility.urgent.v4", "once")).toBe(99);
    expect(price("visibility.pack.general.v4", "once")).toBe(690);
    expect(price("visibility.pack.vehicle.v4", "once")).toBe(1_490);
    expect(price("visibility.immo.top.a.v4", "once")).toBe(2_690);
    expect(price("visibility.immo.top.b.v4", "once")).toBe(2_990);
    expect(
      draft.paidPlacementPolicies.every(
        (policy) => policy.organicRankingIsolation,
      ),
    ).toBe(true);
  });

  it("configures individual fees in integers and retains secure-payment reference metadata", () => {
    expect(price("vehicle.additional-slot.v4", "once")).toBe(490);
    const buyerProtection = draft.rules.find(
      (rule) => rule.key === "fees.buyer_protection.fr",
    );
    expect(buyerProtection?.outcome).toMatchObject({
      feeRateBps: 170,
      fixedFeeMinor: 25,
    });
    expect(draft.commercialEconomics).toContainEqual(
      expect.objectContaining({
        productId: "vehicle.secure-payment.v4",
        referenceAmountMinor: 666,
        approvalStatus: "missing_inputs",
      }),
    );
  });
});
