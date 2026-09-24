import { describe, expect, it } from "vitest";
import { distanceKmBetween } from "@shongre/contracts/geospatial";
import type { Listing } from "../../src/shared/types/index.js";
import {
  toPublicListing,
  type ListingLocationPolicy,
} from "../../src/shared/public-projections.js";
import type { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";

/**
 * The projection needs a taxonomy only for category fields, which this suite is
 * not about. A minimal stand-in keeps the location behaviour isolated.
 */
const taxonomy = {
  getBundle: () => ({ attributes: [], attributeGroups: [] }),
  projectIdentity: () => null,
} as unknown as TaxonomyV1Service;

const POLICY: ListingLocationPolicy = {
  displacementSecret: "server-held-secret",
  displacementRadiusMeters: 1_000,
};

const HOME = { latitude: 48.8566, longitude: 2.3522 };

const listing = (overrides: Partial<Listing> = {}): Listing =>
  ({
    id: "11111111-2222-3333-4444-555555555555",
    sellerId: "seller-1",
    categoryId: "electronics",
    title: "Objet",
    description: "Description",
    price: 10,
    currency: "EUR",
    status: "published",
    condition: "bon-etat",
    marketCode: "FR",
    city: "Paris",
    postalCode: "75001",
    country: "FR",
    allowedDelivery: [],
    images: [],
    attributes: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }) as unknown as Listing;

describe("public employment price presentation", () => {
  it("keeps the published salary range and period without exposing raw salary attributes", () => {
    const published = toPublicListing(
      listing({
        categoryId: "jobs",
        price: 12.5,
        attributes: {
          salaryIsPublic: true,
          salaryMinimumMinor: 1250,
          salaryMaximumMinor: 1450,
          salaryFrequencyId: "employment.fr.salary_frequency.hour",
        },
      }),
      taxonomy,
    );
    expect(published.pricePresentation).toEqual({
      kind: "salary",
      visibility: "public",
      currency: "EUR",
      minimumAmountMinor: 1250,
      maximumAmountMinor: 1450,
      period: "hour",
    });
    expect(published.attributes.salaryMinimumMinor).toBeUndefined();
  });

  it("does not disclose hidden salary amounts", () => {
    const published = toPublicListing(
      listing({
        categoryId: "jobs",
        attributes: {
          salaryIsPublic: false,
          salaryMinimumMinor: 4500000,
          salaryFrequencyId: "employment.fr.salary_frequency.year",
        },
      }),
      taxonomy,
    );
    expect(published.pricePresentation).toEqual({
      kind: "salary",
      visibility: "undisclosed",
      currency: "EUR",
      period: "year",
    });
  });
});

describe("public listing location", () => {
  it("never publishes the stored point verbatim under the default policy", () => {
    const published = toPublicListing(
      listing({ ...HOME, locationPrecision: "approximate" }),
      taxonomy,
      POLICY,
    );
    expect(published.locationPrecision).toBe("approximate");
    expect(published.latitude).toBeDefined();
    expect({
      latitude: published.latitude,
      longitude: published.longitude,
    }).not.toEqual(HOME);
    expect(
      distanceKmBetween(HOME, {
        latitude: published.latitude!,
        longitude: published.longitude!,
      }),
    ).toBeLessThanOrEqual(1.001);
  });

  it("falls back to the town rather than the real point when no secret is supplied", () => {
    // A doorstep a few streets from the centroid, so the fallback is visible.
    const doorstep = { latitude: 48.8698, longitude: 2.3075 };
    const published = toPublicListing(
      listing({ ...doorstep, locationPrecision: "approximate" }),
      taxonomy,
    );
    expect(published.locationPrecision).toBe("city");
    expect(published.latitude).not.toBe(doorstep.latitude);
    expect(published.latitude).toBeCloseTo(48.8566, 3);
  });

  it("publishes nothing at all when the policy hides the location", () => {
    const published = toPublicListing(
      listing({ ...HOME, locationPrecision: "hidden" }),
      taxonomy,
      POLICY,
    );
    expect(published.locationPrecision).toBe("hidden");
    expect(published.latitude).toBeUndefined();
    expect(published.longitude).toBeUndefined();
  });

  it("publishes the real point only when the policy says exact", () => {
    const published = toPublicListing(
      listing({ ...HOME, locationPrecision: "exact" }),
      taxonomy,
      POLICY,
    );
    expect(published.locationPrecision).toBe("exact");
    expect(published.latitude).toBe(HOME.latitude);
    expect(published.longitude).toBe(HOME.longitude);
  });

  it("resolves the town when the row carries no coordinate", () => {
    const published = toPublicListing(
      listing({ city: "Bordeaux" }),
      taxonomy,
      POLICY,
    );
    expect(published.locationPrecision).toBe("city");
    expect(published.latitude).toBeCloseTo(44.8378, 3);
  });

  it("publishes nothing for an unknown town with no coordinate", () => {
    const published = toPublicListing(
      listing({ city: "Village-Que-Personne-Ne-Connait" }),
      taxonomy,
      POLICY,
    );
    expect(published.locationPrecision).toBe("hidden");
    expect(published.latitude).toBeUndefined();
  });

  it("treats a zeroed coordinate as absent rather than as the Gulf of Guinea", () => {
    const published = toPublicListing(
      listing({ latitude: 0, longitude: 0, locationPrecision: "approximate" }),
      taxonomy,
      POLICY,
    );
    expect(published.locationPrecision).toBe("city");
    expect(published.latitude).toBeCloseTo(48.8566, 3);
  });

  it("never lets a private location column reach the public payload", () => {
    const published = toPublicListing(
      listing({
        ...HOME,
        locationPrecision: "approximate",
        normalizedAddress: "12 rue de la Paix, 75002 Paris",
        locationSource: "geocoded",
        geocodingProvider: "nominatim",
        geocodedAt: "2026-01-01T00:00:00.000Z",
        locationUpdatedAt: "2026-01-01T00:00:00.000Z",
      }),
      taxonomy,
      POLICY,
    );
    const serialized = JSON.stringify(published);
    expect(serialized).not.toContain("rue de la Paix");
    expect(serialized).not.toContain("nominatim");
    for (const key of [
      "normalizedAddress",
      "locationSource",
      "geocodingProvider",
      "geocodedAt",
      "locationUpdatedAt",
    ]) {
      expect(published).not.toHaveProperty(key);
    }
  });

  it("gives the same listing the same published point on every call", () => {
    const row = listing({ ...HOME, locationPrecision: "approximate" });
    const first = toPublicListing(row, taxonomy, POLICY);
    const second = toPublicListing(row, taxonomy, POLICY);
    expect(second.latitude).toBe(first.latitude);
    expect(second.longitude).toBe(first.longitude);
  });
});
