import { describe, expect, it } from "vitest";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import type { Listing } from "../../src/shared/types/index.js";

/**
 * The demo repository is what the browser suite runs against, so the spatial
 * contract has to hold here as well as in PostGIS. These assert the contract —
 * radius, viewport, distance and ordering — not the mechanism.
 */

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const VERSAILLES = { latitude: 48.8014, longitude: 2.1301 };
const LYON = { latitude: 45.764, longitude: 4.8357 };

async function repositoryWith(
  points: Array<{ id: string; latitude?: number; longitude?: number }>,
) {
  const repository = new DemoListingRepository();
  const seeded = await repository.search({ marketCode: "FR", limit: 500 });
  // Start from a known-empty set so the fixture's own rows cannot answer.
  for (const listing of seeded.items) await repository.delete(listing.id);
  for (const point of points) {
    await repository.save({
      id: point.id,
      sellerId: "seller-1",
      categoryId: "electronics",
      title: `Annonce ${point.id}`,
      description: "Description",
      price: 10,
      currency: "EUR",
      status: "published",
      condition: "bon-etat",
      marketCode: "FR",
      city: "Paris",
      postalCode: "75001",
      country: "FR",
      latitude: point.latitude,
      longitude: point.longitude,
      allowedDelivery: [],
      images: [],
      attributes: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as unknown as Listing);
  }
  return repository;
}

describe("radius search", () => {
  it("keeps what is inside the radius and drops what is outside", async () => {
    const repository = await repositoryWith([
      { id: "paris", ...PARIS },
      { id: "versailles", ...VERSAILLES },
      { id: "lyon", ...LYON },
    ]);
    const { items } = await repository.search({
      marketCode: "FR",
      center: PARIS,
      radiusKm: 30,
    });
    expect(items.map((item) => item.id).sort()).toEqual([
      "paris",
      "versailles",
    ]);
  });

  it("reports the distance it measured", async () => {
    const repository = await repositoryWith([
      { id: "paris", ...PARIS },
      { id: "versailles", ...VERSAILLES },
    ]);
    const { items } = await repository.search({
      marketCode: "FR",
      center: PARIS,
      radiusKm: 50,
    });
    const versailles = items.find((item) => item.id === "versailles");
    expect(versailles?.distanceKm).toBeGreaterThan(15);
    expect(versailles?.distanceKm).toBeLessThan(20);
    expect(items.find((item) => item.id === "paris")?.distanceKm).toBeCloseTo(
      0,
      3,
    );
  });

  it("omits a listing with no usable coordinate rather than placing it", async () => {
    const repository = await repositoryWith([
      { id: "paris", ...PARIS },
      { id: "nowhere" },
      { id: "null-island", latitude: 0, longitude: 0 },
    ]);
    const { items } = await repository.search({
      marketCode: "FR",
      center: PARIS,
      radiusKm: 100,
    });
    expect(items.map((item) => item.id)).toEqual(["paris"]);
  });

  it("orders by distance when asked", async () => {
    const repository = await repositoryWith([
      { id: "lyon", ...LYON },
      { id: "versailles", ...VERSAILLES },
      { id: "paris", ...PARIS },
    ]);
    const { items } = await repository.search({
      marketCode: "FR",
      center: PARIS,
      radiusKm: 500,
      sortBy: "distance",
    });
    expect(items.map((item) => item.id)).toEqual([
      "paris",
      "versailles",
      "lyon",
    ]);
  });
});

describe("map viewport search", () => {
  it("returns only what the visible map contains", async () => {
    const repository = await repositoryWith([
      { id: "paris", ...PARIS },
      { id: "lyon", ...LYON },
    ]);
    const { items } = await repository.search({
      marketCode: "FR",
      boundingBox: { north: 49.2, south: 48.5, east: 2.9, west: 1.8 },
    });
    expect(items.map((item) => item.id)).toEqual(["paris"]);
  });
});
