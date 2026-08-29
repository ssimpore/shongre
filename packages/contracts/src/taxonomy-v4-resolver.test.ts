import { describe, expect, it } from "vitest";
import { getTaxonomyV4PublicBundle } from "./fixtures/generated/taxonomy-v4.public";
import { resolveMarketContext } from "./market-country";
import {
  TaxonomyV4PublicError,
  TaxonomyV4PublicResolver,
} from "./taxonomy-v4-resolver";

const infrastructure = {
  franceDomain: "shongre.fr",
  globalDomain: "shongre.com",
  canonicalProtocol: "https" as const,
};
const market = (hostname: string, pathname = "/") =>
  resolveMarketContext({ hostname, pathname, infrastructure });
const bundle = getTaxonomyV4PublicBundle();
const resolver = new TaxonomyV4PublicResolver(bundle);

describe("TaxonomyV4PublicResolver", () => {
  it.each([
    ["shongre.fr", "/", "FR", "fr-FR", "EUR"],
    ["shongre.com", "/be", "BE", "fr-BE", "EUR"],
    ["shongre.com", "/ch", "CH", "fr-CH", "CHF"],
  ])(
    "resolves the generated tree for %s%s",
    (hostname, pathname, country, locale, currency) => {
      const context = market(hostname, pathname);
      expect(context.countryCode).toBe(country);
      expect(context.locale).toBe(locale);
      expect(context.currency).toBe(currency);
      expect(resolver.tree(context, locale).items).toHaveLength(294);
    },
  );

  it("fails closed for coming-soon, unknown and unsupported versions", () => {
    for (const context of [
      market("shongre.com", "/sn"),
      market("shongre.com", "/bf"),
      market("shongre.com", "/unknown"),
    ]) {
      expect(() => resolver.tree(context, "fr-FR")).toThrow(
        TaxonomyV4PublicError,
      );
    }
    expect(() => resolver.tree(market("shongre.fr"), "fr-FR", "3")).toThrow(
      /Version/,
    );
  });

  it("applies v3 aliases and seller-specific attribute precedence", () => {
    const base = {
      marketContext: market("shongre.fr"),
      categoryIdentity: "vehicles.cars.suv",
      listingTypeId: "vehicles.cars.suv.listing",
      locale: "fr-FR",
    } as const;
    const individual = resolver.resolve({ ...base, sellerType: "individual" });
    const professional = resolver.resolve({
      ...base,
      sellerType: "professional",
    });
    expect(individual.category.id).toBe("vehicles.cars.suv");
    expect(
      individual.attributes.some(({ definition }) => definition.id === "siren"),
    ).toBe(false);
    expect(
      professional.attributes.some(
        ({ definition }) => definition.id === "siret",
      ),
    ).toBe(true);
    expect(() =>
      resolver.resolve({
        marketContext: market("shongre.fr"),
        categoryIdentity: "jobs.offers.it_data",
        listingTypeId: "jobs.offers.it_data.listing",
        sellerType: "individual",
        locale: "fr-FR",
      }),
    ).toThrowError(/profil vendeur/i);
  });

  it("bounds option lookup and enforces explicit cascade parents", () => {
    const page = resolver.lookupOptions({
      optionSetId: "model",
      parentOptionId: "brand:renault",
      limit: 5,
    });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.length).toBeLessThanOrEqual(5);
    expect(page.items.map((item) => item.key)).toEqual([
      "clio",
      "captur",
      "megane",
      "zoe",
    ]);
    expect(() =>
      resolver.lookupOptions({ optionSetId: "model", limit: 201 }),
    ).toThrow(TaxonomyV4PublicError);
  });
});
