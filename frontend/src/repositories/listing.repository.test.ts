import { describe, expect, it } from "vitest";
import { listingRepository } from "./listing.repository";

describe("demo listing repository taxonomy filters", () => {
  it("matches canonical descendants and dynamic range attributes", async () => {
    const result = await listingRepository.getListings({
      categorySlug: "vehicles",
      attributes: {
        year: { min: 2021, max: 2023 },
        fuel: "essence",
      },
    });

    expect(result.listings.map((listing) => listing.id)).toContain("list-102");
  });
});
