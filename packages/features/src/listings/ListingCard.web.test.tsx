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
  characteristicIcons: ["home", "ruler", "layout-grid", "tag", "tag"],
  publishedAt: "2026-08-24T12:00:00.000Z",
  photoCount: 4,
  deliveryAvailable: true,
  seller: {
    id: "agency",
    name: "Agence Canopée avec un nom très long",
    sellerType: "pro",
    avatarUrl: "https://example.test/seller-avatar.jpg",
    isIdentityVerified: true,
    isBusinessVerified: true,
  },
  isUrgent: false,
  isFeatured: true,
};

const identityLabels = {
  pro: "Pro",
  proAccessibility: "Vendeur professionnel",
  verified: "Profil vérifié",
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
        identityLabels={identityLabels}
      />,
    );

    expect(html).toContain('data-listing-card="true"');
    expect(html).toContain('data-listing-card-variant="grid"');
    expect(html).toContain("listing-card-shell");
    expect(html).toContain("line-clamp-2");
    expect(html).toContain("min-h-control-md");
    expect(html).toContain("Sponsorisé");
    expect(html).not.toContain("À la une");
    expect(html).toContain("Appartement");
    expect(html).toContain("68 m²");
    expect(html).toContain('data-listing-card-characteristic-icon="home"');
    expect(html).toContain('data-listing-card-characteristic-icon="ruler"');
    expect(html).toContain("lucide-house");
    expect(html).toContain("lucide-ruler");
    expect(html).not.toContain("3 pièces");
    expect(html).not.toContain(">Bon état<");
    expect(html).not.toContain("Balcon");
    expect(html).toContain('aria-label="Retirer des favoris"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("focus-visible:outline-2");
    expect(html).toContain("Agence Canopée avec un nom très long");
    expect(html).toContain('data-listing-card-footer="true"');
    expect(html).toContain('data-listing-card-content="true"');
    expect(html).toContain('data-listing-card-category-row="true"');
    expect(html).not.toContain('data-listing-card-rating="true"');
    expect(html).toContain('data-listing-card-price="true"');
    expect(html).toContain('data-listing-card-current-price="true"');
    expect(html).toContain('data-listing-card-characteristics="true"');
    expect(html).toContain('data-listing-card-seller="true"');
    expect(html).toContain('data-listing-card-seller-avatar="true"');
    expect(html).toContain('data-listing-card-meta="true"');
    expect(html).not.toContain('data-ui-verified-icon="true"');
    expect(html).toContain('data-ui-pro-badge="true"');
    expect(html).toContain(">Pro<");
    expect(html).toContain('data-listing-card-top-overlay="true"');
    expect(html).toContain('data-listing-card-promotion="true"');
    expect(html).toContain('data-listing-card-actions="true"');
    expect(html).toContain('data-listing-card-media-meta="true"');
    expect(html).toContain('data-listing-card-photo-count="true"');
    expect(html).toContain('data-listing-card-delivery-overlay="true"');
    expect(html).toContain('src="https://example.test/seller-avatar.jpg"');
    expect(html).toContain('title="Agence Canopée avec un nom très long"');
    expect(html.indexOf('data-listing-card-seller="true"')).toBeGreaterThan(
      html.indexOf("Caractéristiques principales"),
    );
    expect(
      html.indexOf('data-listing-card-delivery-overlay="true"'),
    ).toBeLessThan(html.indexOf('data-listing-card-footer="true"'));
    expect(html).toContain("listing-card-seller-grid");
    expect(html).toContain('data-listing-card-seller-name="true"');
    expect(html).toContain('data-listing-card-location="true"');
    expect(html).toContain("inline-flex min-w-0 max-w-full items-center gap-1");
    expect(html).toContain("min-w-0 truncate font-bold text-text-main");
    expect(html).toContain("min-w-0 flex-1 truncate");
    expect(html).not.toContain("absolute left-0 top-2 hidden sm:block");
    expect(html).toContain("min-w-0 break-words tracking-tight");
  });

  it("groups price hierarchy and rating metadata without changing the card content", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{
          ...baseListing,
          originalPrice: { amountMinor: 149_000, currency: "EUR" },
          isNegotiable: true,
          seller: {
            ...baseListing.seller!,
            rating: 4.9,
            reviewCount: 14,
          },
        }}
        href="/annonce/listing-card-test"
        locale="fr-FR"
        identityLabels={identityLabels}
      />,
    );

    expect(html).toContain('data-listing-card-rating="true"');
    expect(html).toContain('data-listing-card-current-price="true"');
    expect(html).toContain('data-listing-card-original-price="true"');
    expect(html).toContain('data-listing-card-negotiable="true"');
    expect(html).toContain("(14)");
    expect(html).not.toContain("hidden sm:inline font-normal text-text-muted");
    expect(html.indexOf('data-listing-card-current-price="true"')).toBeLessThan(
      html.indexOf('data-listing-card-original-price="true"'),
    );
    expect(
      html.indexOf('data-listing-card-original-price="true"'),
    ).toBeLessThan(html.indexOf('data-listing-card-negotiable="true"'));
  });

  it("uses the canonical verification icon only for verified individual sellers", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{
          ...baseListing,
          seller: {
            ...baseListing.seller!,
            sellerType: "individual",
            isBusinessVerified: false,
          },
        }}
        href="/annonce/listing-card-test"
        identityLabels={identityLabels}
      />,
    );

    expect(html).toContain('data-ui-verified-icon="true"');
    expect(html).toContain("lucide-badge-check");
    expect(html).toContain("text-text-inverse h-icon-sm w-icon-sm");
    expect(html).toContain("h-full w-full fill-success");
    expect(html).not.toContain(">Pro<");
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
        identityLabels={identityLabels}
      />,
    );

    expect(html).toContain("1 290 € / mois");
    expect(html).not.toContain("Caractéristiques principales");
    expect(html).not.toContain("photos");
    expect(html).not.toContain("aria-pressed");
  });

  it("uses a compact publication age without relative direction copy", () => {
    const dateNow = vi
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-09-02T10:00:00.000Z").getTime());
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{
          ...baseListing,
          publishedAt: "2026-08-12T10:00:00.000Z",
        }}
        href="/annonce/listing-card-test"
        locale="fr-FR"
        identityLabels={identityLabels}
      />,
    );
    dateNow.mockRestore();

    expect(html).toContain("3 sem.");
    expect(html).not.toContain("il y a");
  });

  it("limits horizontal result cards to two decision attributes", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{ ...baseListing, isFeatured: false }}
        href="/annonce/listing-card-test"
        variant="list"
        identityLabels={identityLabels}
      />,
    );

    expect(html).toContain('data-listing-card-variant="list"');
    expect(html).toContain("listing-card-list-link");
    expect(html).toContain("Appartement");
    expect(html).toContain("68 m²");
    expect(html).not.toContain("3 pièces");
  });
});
