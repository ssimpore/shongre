import { describe, expect, it } from "vitest";
import { publicationInputSchema } from "@shongre/contracts";
import { mapBackendListing } from "@/features/listings/listing.mapper";

describe("mobile public contracts", () => {
  it("maps backend major-unit prices into integer minor units", () => {
    const listing = mapBackendListing({
      id: "listing-1",
      title: "Objet test",
      price: 2.99,
      currency: "EUR",
      city: "Paris",
      marketCode: "FR",
      condition: "Bon état",
      createdAt: "2026-08-21T08:00:00.000Z",
    });
    expect(listing.price).toEqual({ amountMinor: 299, currency: "EUR" });
  });

  it("rejects non-integer publication amounts", () => {
    const result = publicationInputSchema.safeParse({
      title: "Objet test",
      description: "",
      amountMinor: 299.5,
      currency: "EUR",
      categoryId: "home",
      marketCode: "FR",
      city: "Paris",
      postalCode: "75001",
      condition: "Bon état",
      images: [],
    });
    expect(result.success).toBe(false);
  });
});
