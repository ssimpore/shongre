import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("route builders", () => {
  it("encodes dynamic segments and rejects missing identifiers", () => {
    expect(routes.listing.detail("listing / été")).toBe(
      "/annonce/listing%20%2F%20%C3%A9t%C3%A9",
    );
    expect(() => routes.listing.detail("   ")).toThrow(
      "A route parameter cannot be empty",
    );
  });

  it("preserves a complete marketplace search context", () => {
    const destination = new URL(
      routes.search({
        query: "vélo gravel",
        category: "loisirs-culture",
        subCategory: "velos",
        city: "Lyon",
        radius: 25,
        minPrice: 200,
        maxPrice: 900,
        sellerType: "pro",
        delivery: true,
        onlinePayment: true,
        onlyDeals: true,
        condition: ["new", "very_good"],
        sortBy: "price_asc",
        market: "FR",
        attributes: {
          brand: "Canyon",
          frame_size: { min: 52, max: 56 },
        },
      }),
      "https://shongre.invalid",
    );

    expect(destination.pathname).toBe("/recherche");
    expect(destination.searchParams.get("query")).toBe("vélo gravel");
    expect(destination.searchParams.get("category")).toBe("loisirs-culture");
    expect(destination.searchParams.get("condition")).toBe("new,very_good");
    expect(destination.searchParams.get("attr_brand")).toBe("Canyon");
    expect(destination.searchParams.get("attr_frame_size_min")).toBe("52");
    expect(destination.searchParams.get("attr_frame_size_max")).toBe("56");
  });

  it("keeps guarded destinations and entity deep links exact", () => {
    const returnTo = "/compte/messages?convId=conv_123#latest";
    const login = new URL(
      routes.auth.login(returnTo),
      "https://shongre.invalid",
    );

    expect(login.searchParams.get("redirect")).toBe(returnTo);
    expect(routes.workspace.messages("conv 123")).toBe(
      "/compte/messages?convId=conv+123",
    );
    expect(routes.workspace.purchases("tx/456")).toBe(
      "/compte/achats?transactionId=tx%2F456",
    );
  });
});
