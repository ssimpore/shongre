import { describe, expect, it } from "vitest";
import type { Listing } from "../../types";
import { MAX_FEATURED_LISTINGS, selectHeroListings } from "./hero-selection";

const base = {
  description: "Annonce",
  categoryId: "electronics",
  categoryLabel: "Électronique",
  price: 120,
  currency: "EUR",
  status: "active",
  marketCode: "FR",
  city: "Lyon",
  postalCode: "69001",
  sellerId: "u1",
  sellerName: "Camille",
  sellerType: "individual",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  expiresAt: "2026-11-01T00:00:00Z",
  deliveryOptions: [],
  photos: [],
  attributes: {},
} as unknown as Listing;

function listing(id: string, overrides: Record<string, unknown> = {}): Listing {
  return {
    ...base,
    id,
    title: id,
    photos: [{ id: `${id}-p`, url: `https://m.example/${id}.jpg` }],
    coverImageUrl: `https://m.example/${id}.jpg`,
    ...overrides,
  } as Listing;
}

const placement = (type: string) => ({
  promotionState: "active",
  promotionType: type,
  promotionSource: "listing_promotions",
  promotionSourceId: "grant-1",
  promotionStartAt: "2000-01-01T00:00:00Z",
  promotionEndAt: "2999-01-01T00:00:00Z",
});

describe("selectHeroListings", () => {
  it("orders sponsored search before other placements before organic, keeping service order inside each group", () => {
    const selected = selectHeroListings(
      [
        listing("organic-1"),
        listing("featured-1", placement("featured")),
        listing("sponsored-1", placement("sponsored_search")),
        listing("organic-2"),
        listing("sponsored-2", placement("sponsored_search")),
      ],
      "fr-FR",
      "FR",
    );
    expect(selected.map((entry) => entry.id)).toEqual([
      "sponsored-1",
      "sponsored-2",
      "featured-1",
      "organic-1",
      "organic-2",
    ]);
  });

  it("prefers listings with media, and only falls back to bare ones when none has any", () => {
    const withMedia = selectHeroListings(
      [
        listing("bare", { photos: [], coverImageUrl: undefined }),
        listing("photo"),
      ],
      "fr-FR",
      "FR",
    );
    expect(withMedia.map((entry) => entry.id)).toEqual(["photo"]);

    const bareOnly = selectHeroListings(
      [listing("bare", { photos: [], coverImageUrl: undefined })],
      "fr-FR",
      "FR",
    );
    expect(bareOnly.map((entry) => entry.id)).toEqual(["bare"]);
  });

  it("drops inactive listings and ranks another market's placement as organic", () => {
    const selected = selectHeroListings(
      [
        listing("sold", { status: "sold" }),
        listing("belgian", { marketCode: "BE", ...placement("featured") }),
        listing("organic"),
      ],
      "fr-FR",
      "FR",
    );
    expect(selected.map((entry) => entry.id)).toEqual(["belgian", "organic"]);
  });

  it("caps the rail and is stable on its own output, so a document-seeded rail selects the same eight", () => {
    const inventory = Array.from({ length: 20 }, (_, index) =>
      listing(`l-${index}`, index % 3 === 0 ? placement("featured") : {}),
    );
    const first = selectHeroListings(inventory, "fr-FR", "FR");
    expect(first).toHaveLength(MAX_FEATURED_LISTINGS);
    expect(selectHeroListings(first, "fr-FR", "FR")).toEqual(first);
  });
});
