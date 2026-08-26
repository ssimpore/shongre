import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("country-awareness regression guard", () => {
  it("keeps publication and payment boundaries free of France/Euro fallbacks", () => {
    const listings = read("src/modules/listings/listings.service.ts");
    const payments = read("src/integrations/providers/payment.provider.ts");

    expect(listings).not.toContain('draft.city || "Paris"');
    expect(listings).not.toContain('draft.postalCode || "75000"');
    expect(listings).not.toContain('toLocaleLowerCase("fr-FR")');
    expect(listings).not.toContain('=== "CH" ? "CHF" : "EUR"');
    expect(payments).not.toContain('currency = "EUR"');
    expect(payments).not.toContain('|| "eur"');
  });

  it("keeps market and provider repositories fail closed", () => {
    const markets = read(
      "src/infrastructure/database/repositories/market.repository.ts",
    );
    const listings = read(
      "src/infrastructure/database/repositories/listing.repository.ts",
    );

    expect(markets).toContain("SAFE_UNAVAILABLE_COMMERCIAL_POLICY");
    expect(markets).toContain("throw new Error(`Unknown market:");
    expect(listings).toContain("listing_market_publications!inner");
    expect(listings).not.toContain('marketCode: "FR"\n      allowedDelivery');
  });
});
