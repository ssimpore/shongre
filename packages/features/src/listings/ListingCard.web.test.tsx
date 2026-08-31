import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ListingCardView } from "@shongre/contracts";
import { ListingCard } from "./ListingCard.web";

const baseListing: ListingCardView = {
  id: "listing-card-test",
  title:
    "Appartement meublé avec un titre volontairement très long proche de Jean Macé",
  price: { amountMinor: 129_000, currency: "EUR" },
  imageUrl: "https://example.test/listing.jpg",
  city: "Lyon 7e · Jean Macé avec une localisation longue",
  marketCode: "FR",
  categoryLabel: "Immobilier",
  conditionLabel: "Bon état",
  characteristics: ["Appartement", "68 m²", "3 pièces", "Balcon", "Bon état"],
  publishedAt: "2026-08-24T12:00:00.000Z",
  photoCount: 4,
  deliveryAvailable: false,
  seller: {
    id: "agency",
    name: "Agence Canopée avec un nom très long",
    sellerType: "pro",
    isIdentityVerified: true,
    isBusinessVerified: true,
  },
  isUrgent: false,
  isFeatured: true,
};

describe("canonical web listing card", () => {
  it("keeps long essential content in one accessible shared anatomy", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={baseListing}
        href="/annonce/listing-card-test"
        locale="fr-FR"
        isFavorite
        favoriteLabel="Retirer des favoris"
        onFavoriteToggle={vi.fn()}
      />,
    );

    expect(html).toContain('data-listing-card="true"');
    expect(html).toContain('data-listing-card-variant="grid"');
    expect(html).toContain("listing-card-shell");
    expect(html).toContain("line-clamp-2");
    expect(html).toContain("min-h-control-md");
    expect(html).toContain("À la une · sponsorisé");
    expect(html).toContain("Appartement");
    expect(html).toContain("68 m²");
    expect(html).toContain("3 pièces");
    expect(html).not.toContain("Balcon");
    expect(html).toContain('aria-label="Retirer des favoris"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("focus-visible:outline-2");
    expect(html).toContain("Agence Canopée avec un nom très long");
    expect(html).toContain("min-w-0 break-words");
  });

  it("uses category price labels and collapses absent optional rows", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{
          ...baseListing,
          priceLabel: "1 290 € / mois",
          conditionLabel: "",
          characteristics: [],
          seller: undefined,
          categoryLabel: undefined,
          photoCount: 0,
          isFeatured: false,
        }}
        href="/annonce/listing-card-test"
        locale="fr-FR"
      />,
    );

    expect(html).toContain("1 290 € / mois");
    expect(html).not.toContain("Caractéristiques principales");
    expect(html).not.toContain("photos");
    expect(html).not.toContain("aria-pressed");
  });

  it("limits horizontal result cards to two decision attributes", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{ ...baseListing, isFeatured: false }}
        href="/annonce/listing-card-test"
        variant="list"
      />,
    );

    expect(html).toContain('data-listing-card-variant="list"');
    expect(html).toContain("listing-card-list-link");
    expect(html).toContain("Appartement");
    expect(html).toContain("68 m²");
    expect(html).not.toContain("3 pièces");
  });
});
