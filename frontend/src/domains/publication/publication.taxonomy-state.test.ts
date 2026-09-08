import { recordedTaxonomyResponses } from "@shongre/contracts/testing/taxonomy-responses";
import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import {
  isCurrentTaxonomyV1Schema,
  retainTaxonomyV1Attributes,
  sanitizePublicationDraftForSubmission,
  toTaxonomyV1ListingIntent,
} from "./publication.taxonomy-state";
import type { PublicationDraftState } from "./publication.types";

const marketContext = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure: {
    franceDomain: "shongre.fr",
    globalDomain: "shongre.com",
    canonicalProtocol: "https",
  },
});
const resolver = recordedTaxonomyResponses;

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
      isCurrentTaxonomyV1Schema(
        electronics,
        "electronics.computers.laptops",
        "SELL",
      ),
    ).toBe(true);
    expect(
      isCurrentTaxonomyV1Schema(
        electronics,
        "home_garden.furniture.sofas",
        "SELL",
      ),
    ).toBe(false);
    expect(
      isCurrentTaxonomyV1Schema(
        electronics,
        "electronics.computers.laptops",
        "DONATE",
      ),
    ).toBe(false);
    expect(isCurrentTaxonomyV1Schema(electronics, "", "SELL")).toBe(false);
  });

  it("removes values from a previous category while retaining shared values", () => {
    const electronics = resolveSchema("electronics.computers.laptops");

    expect(
      retainTaxonomyV1Attributes(
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
    expect(toTaxonomyV1ListingIntent("GIVE")).toBe("DONATE");
    expect(toTaxonomyV1ListingIntent("RENT")).toBe("RENT_OUT");
    expect(toTaxonomyV1ListingIntent("OFFER_SERVICE")).toBe("SERVICE_OFFER");
  });

  it("preserves valid shared answers and removes stale values before submission", () => {
    const schema = resolveSchema("electronics.computers.laptops");
    const draft = {
      marketCode: "FR",
      taxonomyNodeId: schema.category.id,
      taxonomyPath: [
        "electronics",
        "electronics.computers",
        schema.category.id,
      ],
      listingTypeId: schema.listingType.id,
      taxonomyVersion: "v1",
      listingIntent: "SELL",
      title: "Ordinateur portable professionnel",
      description: "Ordinateur en très bon état, testé et prêt à utiliser.",
      condition: "very_good",
      attributes: {
        brand: "renault",
        storage_capacity_gb: 512,
        hidden_from_previous_category: "never-submit",
      },
      photos: [],
      pricing: {
        priceModel: "fixed",
        amount: 800,
        currency: "EUR",
        isNegotiable: false,
        isFreeDonation: false,
      },
      fulfillment: {
        allowHandDelivery: true,
        allowParcelShipping: true,
      },
      fulfillmentTypes: ["PHYSICAL"],
      location: {
        city: "Paris",
        postalCode: "75001",
        countryCode: "FR",
        hideExactAddress: true,
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    } satisfies PublicationDraftState;
    const safe = sanitizePublicationDraftForSubmission({
      draft,
      schema,
      sellerType: "individual",
    });
    expect(safe.attributes.brand).toBe("renault");
    expect(safe.attributes.storage_capacity_gb).toBe(512);
    expect(safe.attributes).not.toHaveProperty("hidden_from_previous_category");
    expect(safe.fulfillmentTypes).toEqual(["PHYSICAL"]);
  });
});
