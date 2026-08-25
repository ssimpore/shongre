import { describe, expect, it } from "vitest";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";

describe("listing search market isolation", () => {
  it("never returns another country's listings by default market scope", async () => {
    const france = CANONICAL_DEMO_LISTINGS.list_1;
    const belgium = {
      ...france,
      id: "list_be_1",
      title: "Vélo urbain Bruxelles",
      marketCode: "BE",
      country: "BE",
      city: "Bruxelles",
      postalCode: "1000",
    };
    const repository = new DemoListingRepository({
      [france.id]: france,
      [belgium.id]: belgium,
    });

    const fr = await repository.search({ marketCode: "FR" });
    const be = await repository.search({ marketCode: "BE" });
    const ch = await repository.search({ marketCode: "CH" });

    expect(fr.items.map((listing) => listing.id)).toEqual([france.id]);
    expect(be.items.map((listing) => listing.id)).toEqual([belgium.id]);
    expect(ch.items).toEqual([]);
  });
});
