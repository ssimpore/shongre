import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/generated-api-operation", () => ({ apiOperation: vi.fn() }));

import { apiOperation } from "@/api/generated-api-operation";
import { HttpListingsService } from "@/features/listings/listings.service";
import { buildListingFactPresentation } from "@shongre/features/listings/facts";

/**
 * The native listing screen showed a photo, a price and a city while the Web
 * page showed what the listing actually is. Closing that gap only counts if
 * both platforms read the *same* answer, so what is pinned here is that the
 * native service asks the same two questions the Web page asks, scoped to the
 * caller's market, and feeds them through the shared projection.
 */
describe("native listing detail parity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the published characteristics for the caller's market", async () => {
    vi.mocked(apiOperation).mockResolvedValueOnce({
      groups: [
        {
          id: "grp.characteristics",
          label: "Caractéristiques",
          items: [
            {
              code: "brand",
              icon: "tag",
              label: "Marque",
              value: "Peugeot",
              presentation: "fact",
            },
            {
              code: "pool",
              icon: "bath",
              label: "Piscine",
              value: "Oui",
              presentation: "feature",
            },
          ],
        },
      ],
    } as never);

    const data = await new HttpListingsService().characteristics(
      "listing-1",
      "BE",
    );
    expect(apiOperation).toHaveBeenCalledWith(
      "getListingCharacteristics",
      { path: { id: "listing-1" } },
      "BE",
    );

    // The same projection the Web page uses, so the two cannot disagree about
    // which items are values and which are capabilities.
    const facts = buildListingFactPresentation(data);
    expect(facts.keyFacts.map((fact) => fact.code)).toEqual(["brand"]);
    expect(facts.features[0].icon).toBe("bath");
    expect(facts.features.map((feature) => feature.label)).toEqual(["Piscine"]);
  });

  it("keeps the screen usable when characteristics are unavailable", async () => {
    vi.mocked(apiOperation).mockRejectedValueOnce(new Error("upstream down"));
    await expect(
      new HttpListingsService().characteristics("listing-1", "FR"),
    ).resolves.toBeNull();
  });

  it("asks the API for one seller's listings rather than filtering on device", async () => {
    vi.mocked(apiOperation).mockResolvedValueOnce({ items: [] } as never);
    await new HttpListingsService().bySeller("seller-1", "FR");
    expect(apiOperation).toHaveBeenCalledWith(
      "postListingsSearch",
      { body: { marketCode: "FR", sellerId: "seller-1", limit: 8 } },
      "FR",
    );
  });
});
