import { describe, expect, it } from "vitest";
import {
  TaxonomyV4PublicResolver,
  resolveMarketContext,
} from "@shongre/contracts";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import {
  isCurrentTaxonomyV4Schema,
  retainTaxonomyV4Attributes,
  toTaxonomyV4ListingIntent,
} from "./publication.taxonomy-state";

const marketContext = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure: {
    franceDomain: "shongre.fr",
    globalDomain: "shongre.com",
    canonicalProtocol: "https",
  },
});
const resolver = new TaxonomyV4PublicResolver(getTaxonomyV4PublicBundle());

const resolveSchema = (categoryIdentity: string) =>
  resolver.resolve({
    marketContext,
    categoryIdentity,
    intent: "SELL",
    sellerType: "individual",
    locale: "fr-FR",
  });

describe("publication taxonomy state", () => {
  it("only activates a schema for the exact current category and intent", () => {
    const electronics = resolveSchema("electronics.computers.laptops");

    expect(
      isCurrentTaxonomyV4Schema(
        electronics,
        "electronics.computers.laptops",
        "SELL",
      ),
    ).toBe(true);
    expect(
      isCurrentTaxonomyV4Schema(
        electronics,
        "home_garden.furniture.sofas",
        "SELL",
      ),
    ).toBe(false);
    expect(
      isCurrentTaxonomyV4Schema(
        electronics,
        "electronics.computers.laptops",
        "DONATE",
      ),
    ).toBe(false);
    expect(isCurrentTaxonomyV4Schema(electronics, "", "SELL")).toBe(false);
  });

  it("removes values from a previous category while retaining shared values", () => {
    const electronics = resolveSchema("electronics.computers.laptops");

    expect(
      retainTaxonomyV4Attributes(
        {
          brand: "Apple",
          storage_capacity_gb: 512,
          furniture_type: "sofa",
        },
        electronics,
      ),
    ).toEqual({
      brand: "Apple",
      storage_capacity_gb: 512,
    });
  });

  it("normalizes persisted v3 intents before comparing v4 schemas", () => {
    expect(toTaxonomyV4ListingIntent("GIVE")).toBe("DONATE");
    expect(toTaxonomyV4ListingIntent("RENT")).toBe("RENT_OUT");
    expect(toTaxonomyV4ListingIntent("OFFER_SERVICE")).toBe("SERVICE_OFFER");
  });
});
