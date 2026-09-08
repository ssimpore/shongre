import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PublicSellerProfile } from "../../../types";
import { ListingSellerTrustSection } from "./ListingSellerTrustSection";

const seller: PublicSellerProfile = {
  id: "seller-1",
  slug: "seller-1",
  name: "Camille Martin",
  accountType: "individual",
  sellerType: "individual",
  country: "FR",
  city: "Lyon",
  isVerified: false,
  isBusinessVerified: false,
  rating: 0,
  reviewCount: 0,
  responseRatePercent: 0,
};

function renderSeller(profile: PublicSellerProfile) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ListingSellerTrustSection seller={profile} />
    </MemoryRouter>,
  );
}

describe("listing seller trust section", () => {
  it("never invents a rating or response time when the backend has none", () => {
    const html = renderSeller(seller);

    expect(html).not.toContain("5.0");
    expect(html).not.toContain("en quelques heures");
    expect(html).not.toContain("(0 avis)");
    expect(html).toContain("Taux de réponse : 0%");
    expect(html).toContain("Lyon");
  });

  it("shows only the supplied rating, verification and response facts", () => {
    const html = renderSeller({
      ...seller,
      accountType: "professional",
      sellerType: "pro",
      isBusinessVerified: true,
      rating: 4.86,
      reviewCount: 42,
      responseRatePercent: 87,
      responseTimeText: "en moins de 2 h",
    });

    expect(html).toContain("4,9");
    expect(html).toContain("(42 avis)");
    expect(html).toContain("Répond en moins de 2 h");
    expect(html).toContain("Taux de réponse : 87%");
    expect(html).toContain("Vérifié");
    expect(html).toContain("Voir la boutique");
  });
});
