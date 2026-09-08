import { describe, expect, it } from "vitest";
import {
  accountDeletionRequestSchema,
  listingCardSchema,
  moneySchema,
  reportInputSchema,
} from "./index";

describe("shared public contracts", () => {
  it("requires integer minor-unit money", () => {
    expect(
      moneySchema.safeParse({ amountMinor: 299, currency: "EUR" }).success,
    ).toBe(true);
    expect(
      moneySchema.safeParse({ amountMinor: 2.99, currency: "EUR" }).success,
    ).toBe(false);
  });

  it("requires a report target and useful details", () => {
    expect(
      reportInputSchema.safeParse({
        listingId: "listing-1",
        reason: "fraud",
        details: "Demande de paiement en dehors de Shongre.",
      }).success,
    ).toBe(true);
    expect(
      reportInputSchema.safeParse({ reason: "other", details: "Trop court" })
        .success,
    ).toBe(false);
    expect(
      reportInputSchema.safeParse({
        deliveryRequestId: "418711cb-aee0-4fa3-a102-8ec6ea2a2cb8",
        reason: "prohibited",
        details: "Le colis décrit semble appartenir à une catégorie interdite.",
      }).success,
    ).toBe(true);
    expect(
      reportInputSchema.safeParse({
        listingId: "listing-1",
        deliveryRequestId: "418711cb-aee0-4fa3-a102-8ec6ea2a2cb8",
        reason: "other",
        details: "Un signalement ne doit viser qu’une seule ressource.",
      }).success,
    ).toBe(false);
  });

  it("limits deletion reasons while requiring reauthentication", () => {
    expect(
      accountDeletionRequestSchema.safeParse({ password: "secret" }).success,
    ).toBe(true);
    expect(
      accountDeletionRequestSchema.safeParse({
        password: "",
        reason: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("rejects malformed listing cards at the client boundary", () => {
    expect(
      listingCardSchema.safeParse({
        id: "listing-1",
        title: "Vélo",
        price: { amountMinor: 45000, currency: "EUR" },
        city: "Paris",
        marketCode: "France",
        conditionLabel: "Bon état",
        publishedAt: "2026-08-21T10:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("accepts a public seller avatar in the listing-card projection", () => {
    expect(
      listingCardSchema.safeParse({
        id: "listing-1",
        title: "Vélo",
        price: { amountMinor: 45000, currency: "EUR" },
        city: "Paris",
        marketCode: "FR",
        categoryLabel: "Sports",
        conditionLabel: "Bon état",
        publishedAt: "2026-08-21T10:00:00Z",
        seller: {
          id: "seller-1",
          name: "Thomas Laurent",
          sellerType: "individual",
          avatarUrl: "https://images.example.com/thomas.jpg",
        },
      }).success,
    ).toBe(true);
  });

  it("preserves optional brand and semantic price data on listing cards", () => {
    const listing = {
      id: "listing-sofa",
      title: "Canapé trois places",
      city: "Lyon",
      marketCode: "FR",
      categoryLabel: "Maison",
      brandLabel: "IKEA",
      priceKind: "on_request",
      conditionLabel: "Bon état",
      publishedAt: "2026-08-21T10:00:00Z",
    };

    expect(listingCardSchema.safeParse(listing).success).toBe(true);
    expect(
      listingCardSchema.safeParse({ ...listing, brandLabel: "" }).success,
    ).toBe(false);
    expect(
      listingCardSchema.safeParse({ ...listing, priceKind: "zero" }).success,
    ).toBe(false);
    expect(
      listingCardSchema.safeParse({ ...listing, priceKind: undefined }).success,
    ).toBe(false);
    const { publishedAt: _publishedAt, ...withoutPublishedAt } = listing;
    expect(listingCardSchema.safeParse(withoutPublishedAt).success).toBe(true);
    expect(
      listingCardSchema.safeParse({
        ...listing,
        priceKind: "amount",
        price: { amountMinor: 25_000, currency: "EUR" },
      }).success,
    ).toBe(true);
    expect(
      listingCardSchema.safeParse({
        ...listing,
        priceKind: "free",
        price: { amountMinor: 25_000, currency: "EUR" },
      }).success,
    ).toBe(false);
    expect(
      listingCardSchema.safeParse({
        ...listing,
        priceKind: "unpriced",
        price: { amountMinor: 0, currency: "EUR" },
      }).success,
    ).toBe(false);
  });

  it("requires complete exact-market promotion proof on listing cards", () => {
    const listing = {
      id: "listing-promoted",
      title: "Canapé",
      price: { amountMinor: 25_000, currency: "EUR" },
      priceKind: "amount" as const,
      city: "Lyon",
      marketCode: "FR",
      categoryLabel: "Maison",
      conditionLabel: "Bon état",
      promotion: {
        state: "active" as const,
        type: "featured" as const,
        marketCode: "FR",
        source: "purchase" as const,
        sourceId: "opaque-promotion-proof",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-10-01T00:00:00.000Z",
      },
    };

    expect(listingCardSchema.safeParse(listing).success).toBe(true);
    expect(
      listingCardSchema.safeParse({
        ...listing,
        promotion: { ...listing.promotion, marketCode: "BE" },
      }).success,
    ).toBe(false);
    const { sourceId: _sourceId, ...withoutSourceId } = listing.promotion;
    expect(
      listingCardSchema.safeParse({
        ...listing,
        promotion: withoutSourceId,
      }).success,
    ).toBe(false);
  });

  it("accepts only shared semantic icons for listing characteristics", () => {
    const listing = {
      id: "listing-vehicle",
      title: "Peugeot 3008",
      price: { amountMinor: 2_490_000, currency: "EUR" },
      city: "Lyon",
      marketCode: "FR",
      categoryLabel: "Véhicules",
      conditionLabel: "Occasion",
      characteristics: ["2019", "84 500 km"],
      publishedAt: "2026-08-21T10:00:00Z",
    };

    expect(
      listingCardSchema.safeParse({
        ...listing,
        characteristicIcons: ["calendar", "gauge"],
      }).success,
    ).toBe(true);
    expect(
      listingCardSchema.safeParse({
        ...listing,
        characteristicIcons: ["calendar", "one-off-speedometer"],
      }).success,
    ).toBe(false);
  });
});
