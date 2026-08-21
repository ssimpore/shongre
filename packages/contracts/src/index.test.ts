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
});
