import { describe, expect, it } from "vitest";
import type { PublicationDraftState } from "../../../domains/publication/publication.types";
import { publicationPayload } from "./http-listings.service";

const draft: PublicationDraftState = {
  marketCode: "FR",
  taxonomyNodeId: "electronics.computers.laptops",
  taxonomyPath: [
    "electronics",
    "electronics.computers",
    "electronics.computers.laptops",
  ],
  listingTypeId: "electronics.computers.laptops.listing",
  taxonomyVersion: "4.0.0",
  listingIntent: "SELL",
  title: "Ordinateur portable professionnel",
  description: "Ordinateur complet, testé et prêt à utiliser.",
  condition: "very_good",
  attributes: {
    brand: "renault",
    storage_capacity_gb: 512,
    stale_hidden_value: "never-submit",
    siret: "unauthorized-for-individual",
  },
  photos: [],
  pricing: {
    priceModel: "fixed",
    amount: 800,
    currency: "EUR",
    isNegotiable: false,
    isFreeDonation: false,
  },
  transaction: {
    allowContact: true,
    allowDirectPurchase: true,
    allowReservation: false,
  },
  fulfillment: {
    allowHandDelivery: true,
    allowParcelShipping: true,
    allowBulkyDelivery: false,
    allowSellerDelivery: false,
    allowStorePickup: false,
  },
  fulfillmentTypes: ["PHYSICAL"],
  location: {
    city: "Paris",
    postalCode: "75001",
    countryCode: "FR",
    hideExactAddress: true,
  },
  currentStep: 1,
  updatedAt: "2026-09-02T10:00:00.000Z",
};

describe("HTTP listing publication payload", () => {
  it("allowlists canonical effective bindings and drops stale attributes", () => {
    const payload = publicationPayload(draft);
    const attributes = payload.attributes as Record<string, unknown>;
    expect(attributes.brand).toBe("renault");
    expect(attributes.storage_capacity_gb).toBe(512);
    expect(attributes).not.toHaveProperty("stale_hidden_value");
    expect(attributes).not.toHaveProperty("siret");
    expect(payload.fulfillmentTypes).toEqual(["PHYSICAL"]);
  });
});
