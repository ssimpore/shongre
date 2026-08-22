import { describe, it, expect, beforeEach } from "vitest";
import { MarketResolver, deleteNestedValue } from "./market.resolver";
import { Market } from "./market.types";
import { INITIAL_MARKETS } from "./market.defaults";

describe("Multi-Market Inheritance Engine (MarketResolver)", () => {
  let resolver: MarketResolver;
  let franceMarket: Market;
  let belgiumMarket: Market;
  let spainMarket: Market;

  beforeEach(() => {
    resolver = new MarketResolver();
    // Deep clone from INITIAL_MARKETS for test isolation
    franceMarket = JSON.parse(
      JSON.stringify(INITIAL_MARKETS.find((m) => m.code === "FR")!),
    );
    belgiumMarket = JSON.parse(
      JSON.stringify(INITIAL_MARKETS.find((m) => m.code === "BE")!),
    );
    spainMarket = JSON.parse(
      JSON.stringify(INITIAL_MARKETS.find((m) => m.code === "ES")!),
    );
  });

  describe("Deep Merge & Override Semantics", () => {
    it("inherits unconfigured properties from France baseline", () => {
      const config = resolver.resolveEffectiveConfig(
        belgiumMarket,
        franceMarket,
      );

      // Belgium does NOT override listings.maxActiveListingsIndividual
      expect(config.listings.maxActiveListingsIndividual).toBe(20);
      expect(config.listings.maxPhotosIndividual).toBe(8);
      expect(config.listings.expirationDays).toBe(60);

      // Belgium DOES override localization.phonePrefix & taxes.vatRateStandard
      expect(config.localization.phonePrefix).toBe("+32");
      expect(config.taxes.vatRateStandard).toBe(0.21);
      expect(config.payments.buyerProtectionFixedFee).toBe(0.8);
    });

    it("strictly preserves explicit false override and NEVER falls back to true", () => {
      // France has reservation.enabled = true
      const frConfig = resolver.resolveEffectiveConfig(
        franceMarket,
        franceMarket,
      );
      expect(frConfig.reservation.enabled).toBe(true);

      // Spain has explicit override reservation.enabled = false
      const esConfig = resolver.resolveEffectiveConfig(
        spainMarket,
        franceMarket,
      );
      expect(esConfig.reservation.enabled).toBe(false);
    });

    it("strictly preserves explicit 0 override and does not fall back", () => {
      const customMarket: Market = {
        ...belgiumMarket,
        code: "TEST",
        overrides: {
          listings: {
            maxActiveListingsIndividual: 0,
          },
          payments: {
            buyerProtectionFixedFee: 0,
          },
        },
      };

      const resolved = resolver.resolveEffectiveConfig(
        customMarket,
        franceMarket,
      );
      expect(resolved.listings.maxActiveListingsIndividual).toBe(0);
      expect(resolved.payments.buyerProtectionFixedFee).toBe(0);
    });

    it("dynamically propagates updates to France to inheriting markets without duplicating state", () => {
      // 1. Initially Belgium inherits maxActiveListingsIndividual = 20 from France
      let beConfig = resolver.resolveEffectiveConfig(
        belgiumMarket,
        franceMarket,
      );
      expect(beConfig.listings.maxActiveListingsIndividual).toBe(20);

      // 2. Modify France baseline in overrides
      franceMarket.overrides = {
        listings: {
          maxActiveListingsIndividual: 35,
        },
      };

      // 3. Belgium must now dynamically resolve to 35 without any change to Belgium's own overrides
      beConfig = resolver.resolveEffectiveConfig(belgiumMarket, franceMarket);
      expect(beConfig.listings.maxActiveListingsIndividual).toBe(35);
    });

    it("retains local override when France is updated on that same key", () => {
      // Spain has an explicit phonePrefix = '+34'
      expect(spainMarket.overrides.localization?.phonePrefix).toBe("+34");

      // Update France phonePrefix
      franceMarket.overrides = {
        localization: {
          phonePrefix: "+339",
        },
      };

      const esConfig = resolver.resolveEffectiveConfig(
        spainMarket,
        franceMarket,
      );
      expect(esConfig.localization.phonePrefix).toBe("+34");
    });

    it("resets an override by deleting the local delta and resumes dynamic inheritance", () => {
      // 1. Belgium has buyerProtectionFixedFee overridden to 0.80
      expect(belgiumMarket.overrides.payments?.buyerProtectionFixedFee).toBe(
        0.8,
      );
      let beConfig = resolver.resolveEffectiveConfig(
        belgiumMarket,
        franceMarket,
      );
      expect(beConfig.payments.buyerProtectionFixedFee).toBe(0.8);

      // 2. Delete the override
      deleteNestedValue(
        belgiumMarket.overrides,
        "payments.buyerProtectionFixedFee",
      );

      // 3. Belgium now immediately resolves to France standard (0.70)
      beConfig = resolver.resolveEffectiveConfig(belgiumMarket, franceMarket);
      expect(beConfig.payments.buyerProtectionFixedFee).toBe(0.7);
    });
  });

  describe("Nested Object and Granular Sibling Overrides", () => {
    it("allows overriding a single sibling leaf without overwriting other sibling keys", () => {
      const customMarket: Market = {
        ...belgiumMarket,
        code: "TEST",
        overrides: {
          monetization: {
            boostPricing: {
              urgent: 9.99,
            } as any,
          },
        },
      };

      const config = resolver.resolveEffectiveConfig(
        customMarket,
        franceMarket,
      );
      expect(config.monetization.boostPricing.urgent).toBe(9.99); // Overridden
      expect(config.monetization.boostPricing.highlight).toBe(8.5); // Inherited from the active FR catalog
      expect(config.monetization.boostPricing.top_of_list).toBe(6.9); // Inherited from the active FR catalog
      expect(config.monetization.boostPricing.gallery_boost).toBe(14.9); // Inherited from the active FR catalog
    });
  });

  describe("Provenance and Setting Resolution", () => {
    it("correctly tracks provenance for inherited vs overridden settings", () => {
      // Inherited property in Belgium
      const inheritedRes = resolver.resolveSetting(
        belgiumMarket,
        franceMarket,
        "listings.maxActiveListingsIndividual",
      );
      expect(inheritedRes.isInherited).toBe(true);
      expect(inheritedRes.source).toBe("FR");
      expect(inheritedRes.sourceMarketCode).toBe("FR");
      expect(inheritedRes.overrideDefined).toBe(false);
      expect(inheritedRes.value).toBe(20);

      // Overridden property in Belgium
      const overriddenRes = resolver.resolveSetting(
        belgiumMarket,
        franceMarket,
        "taxes.vatRateStandard",
      );
      expect(overriddenRes.isInherited).toBe(false);
      expect(overriddenRes.source).toBe("LOCAL");
      expect(overriddenRes.sourceMarketCode).toBe("BE");
      expect(overriddenRes.overrideDefined).toBe(true);
      expect(overriddenRes.value).toBe(0.21);
      expect(overriddenRes.frenchReferenceValue).toBe(0.2);
    });

    it("calculates inheritance metrics accurately", () => {
      const frMetrics = resolver.getInheritanceMetrics(
        franceMarket,
        franceMarket,
      );
      expect(frMetrics.percentInherited).toBe(0);
      expect(frMetrics.percentOverridden).toBe(100);

      const beMetrics = resolver.getInheritanceMetrics(
        belgiumMarket,
        franceMarket,
      );
      expect(beMetrics.percentInherited).toBeGreaterThan(80); // Over 80% inherited
      expect(beMetrics.inheritedFieldsCount).toBeGreaterThan(
        beMetrics.overriddenFieldsCount,
      );
    });

    it("calculates impacted markets when a French setting is modified", () => {
      const allMarkets = [franceMarket, belgiumMarket, spainMarket];

      // 'listings.maxActiveListingsIndividual' is not overridden by BE or ES
      const impacted = resolver.getImpactedMarkets(
        "listings.maxActiveListingsIndividual",
        allMarkets,
      );
      expect(impacted).toContain("BE");
      expect(impacted).toContain("ES");
      expect(impacted).not.toContain("FR");

      // 'reservation.enabled' is overridden by ES (false), so only BE inherits it
      const impactedReservation = resolver.getImpactedMarkets(
        "reservation.enabled",
        allMarkets,
      );
      expect(impactedReservation).toContain("BE");
      expect(impactedReservation).not.toContain("ES");
    });
  });
});
