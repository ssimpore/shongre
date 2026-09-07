import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ListingCardView } from "@shongre/contracts";
import { ListingCard, type ListingCardLabels } from "./ListingCard.web";

const baseListing: ListingCardView = {
  id: "listing-card-test",
  title: "Canapé trois places avec un titre volontairement très long",
  price: { amountMinor: 25_000, currency: "EUR" },
  priceKind: "amount",
  imageUrl: "https://example.test/listing.jpg",
  city: "Lyon 3e",
  marketCode: "FR",
  categoryLabel: "Maison",
  brandLabel: "IKEA",
  conditionLabel: "Bon état",
  characteristics: ["Velours", "Trois places"],
  publishedAt: "2026-09-02T12:00:00.000Z",
  seller: {
    id: "agency",
    name: "Agence Canopée",
    sellerType: "pro",
    isIdentityVerified: false,
    isBusinessVerified: true,
    rating: 4.8,
    reviewCount: 32,
  },
  isUrgent: false,
  isFeatured: true,
  promotion: {
    state: "active",
    type: "featured",
    marketCode: "FR",
    source: "purchase",
    sourceId: "listing-card-test-promotion",
    startsAt: "2020-01-01T00:00:00.000Z",
    endsAt: "2100-01-01T00:00:00.000Z",
  },
};

const labels: ListingCardLabels = {
  boosted: "Boosté",
  free: "Gratuit",
  onRequest: "Prix sur demande",
  imageUnavailable: "Image indisponible",
  rating: (rating, count) => `Note ${rating} sur 5, ${count} avis`,
};

const identityLabels = {
  pro: "Pro",
  proAccessibility: "Vendeur professionnel",
  verified: "Profil vérifié",
};

function renderCard(listing: ListingCardView = baseListing) {
  return renderToStaticMarkup(
    <ListingCard
      listing={listing}
      href="/annonce/listing-card-test"
      locale="fr-FR"
      labels={labels}
      identityLabels={identityLabels}
      favoriteAction={<button type="button" aria-label="Retirer des favoris" />}
    />,
  );
}

describe("canonical web listing card", () => {
  it("renders the compact shared anatomy in the specified order", () => {
    const dateNow = vi
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-09-02T14:00:00.000Z").getTime());
    const html = renderCard();
    dateNow.mockRestore();

    const category = html.indexOf('data-listing-card-category-row="true"');
    const price = html.indexOf('data-listing-card-price-row="true"');
    const title = html.indexOf('data-listing-card-title="true"');
    const meta = html.indexOf('data-listing-card-meta="true"');

    expect(category).toBeGreaterThan(-1);
    expect(category).toBeLessThan(price);
    expect(price).toBeLessThan(title);
    expect(title).toBeLessThan(meta);
    expect(html).toContain("Maison");
    expect(html).toContain("IKEA");
    expect(html).toContain("250 €");
    expect(html).toContain(">Pro<");
    expect(html).toContain("4,8");
    expect(html).toContain("(32)");
    expect(html).toContain("Lyon 3e");
    expect(html).toContain("il y a 2 h");
    expect(html).toMatch(/aria-label="[^"]*il y a 2 h/);
    expect(html).toContain("Boosté");
    expect(html).toContain("lucide-zap");
    expect(html).toContain("lucide-star");
    expect(html).toContain("fill-primary text-primary");
    expect(html).toContain('aria-label="Retirer des favoris"');
    expect(html).toContain("listing-card-media");
    expect(html).toContain("focus-within:ring-inset");
  });

  it("omits every old secondary zone and never exposes seller identity copy", () => {
    const html = renderCard();

    expect(html).not.toContain("Agence Canopée");
    expect(html).not.toContain('data-listing-card-characteristics="true"');
    expect(html).not.toContain('data-listing-card-photo-count="true"');
    expect(html).not.toContain('data-listing-card-delivery-overlay="true"');
    expect(html).not.toContain('data-listing-card-seller-avatar="true"');
    expect(html).not.toContain('data-listing-card-original-price="true"');
    expect(html).not.toContain('data-listing-card-negotiable="true"');
  });

  it("shows a brand separator only when a real brand exists", () => {
    const withBrand = renderCard();
    const withoutBrand = renderCard({ ...baseListing, brandLabel: undefined });

    expect(withBrand).toMatch(/Maison[\s\S]*?·[\s\S]*?IKEA/);
    expect(withoutBrand).not.toMatch(/Maison[\s\S]*?·[\s\S]*?IKEA/);
    expect(withoutBrand).not.toContain("IKEA");
  });

  it("localizes a real rating independently from professional status", () => {
    const html = renderCard({
      ...baseListing,
      seller: {
        id: "individual",
        name: "Camille",
        sellerType: "individual",
        isIdentityVerified: false,
        isBusinessVerified: false,
        rating: 4.86,
        reviewCount: 1_234,
      },
    });

    expect(html).not.toContain('data-ui-pro-badge="true"');
    expect(html).toContain('data-listing-card-rating="true"');
    expect(html).toContain("4,9");
    expect(html).toContain("1 234");
    expect(html.match(/lucide-star/g)).toHaveLength(1);
  });

  it("compacts a long visual review count while retaining its accessible value", () => {
    const html = renderCard({
      ...baseListing,
      seller: {
        ...baseListing.seller!,
        reviewCount: 12_345_678,
      },
    });

    expect(html).toContain('aria-label="Note 4,8 sur 5, 12 345 678 avis"');
    expect(html).toContain("(12,3 M)");
    expect(html).toContain("min-w-0 shrink items-center");
  });

  it("shows Pro from the authoritative publisher plane without a public seller profile", () => {
    const html = renderCard({
      ...baseListing,
      publisherType: "professional",
      seller: undefined,
    });

    expect(html).toContain('data-ui-pro-badge="true"');
    expect(html).not.toContain('data-listing-card-rating="true"');
  });

  it("hides rating when the seller has no reviews without inventing a score", () => {
    const html = renderCard({
      ...baseListing,
      seller: {
        ...baseListing.seller!,
        rating: 5,
        reviewCount: 0,
      },
    });

    expect(html).toContain('data-ui-pro-badge="true"');
    expect(html).not.toContain('data-listing-card-rating="true"');
    expect(html).not.toContain("5,0");
  });

  it("shows a real zero rating when reviews exist", () => {
    const html = renderCard({
      ...baseListing,
      seller: {
        ...baseListing.seller!,
        rating: 0,
        reviewCount: 2,
      },
    });

    expect(html).toContain('data-listing-card-rating="true"');
    expect(html).toContain("0,0");
    expect(html).toContain("(2)");
  });

  it.each([
    ["free", "Gratuit"],
    ["on_request", "Prix sur demande"],
    ["amount", "250 €"],
  ] as const)("renders the %s price state", (priceKind, expected) => {
    expect(
      renderCard({
        ...baseListing,
        priceKind,
        price: priceKind === "amount" ? baseListing.price : undefined,
      }),
    ).toContain(expected);
  });

  it("renders no price for a genuinely unpriced category", () => {
    const html = renderCard({
      ...baseListing,
      priceKind: "unpriced",
      price: undefined,
    });
    expect(html).toContain('data-listing-card-price-row="true"');
    expect(html).not.toContain('data-listing-card-current-price="true"');
    expect(html).not.toContain("0 €");
  });

  it("preserves a real category-specific label when an amount is undisclosed", () => {
    const html = renderCard({
      ...baseListing,
      priceKind: "unpriced",
      price: undefined,
      priceLabel: "Rémunération non communiquée",
    });

    expect(html).toContain('data-listing-card-current-price="true"');
    expect(html).toContain("Rémunération non communiquée");
    expect(html).not.toContain("0 €");
  });

  it("uses a neutral reserved fallback when the listing has no image", () => {
    const html = renderCard({ ...baseListing, imageUrl: undefined });
    expect(html).toContain('aria-label="Image indisponible"');
    expect(html).toContain("lucide-image-off");
  });

  it("omits publication metadata when no real publication date exists", () => {
    const { publishedAt: _publishedAt, ...withoutPublishedAt } = baseListing;
    const html = renderCard(withoutPublishedAt);

    expect(html).toContain("Lyon 3e");
    expect(html).not.toContain("il y a");
    expect(html).not.toContain("Invalid");
  });

  it("uses the horizontal room for decision details and seller trust", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={baseListing}
        href="/annonce/listing-card-test"
        variant="list"
        labels={labels}
        identityLabels={identityLabels}
      />,
    );
    expect(html).toContain('data-listing-card-variant="list"');
    expect(html).toContain("listing-card-list-link");
    expect(html).toContain("listing-card-list-overlay");
    expect(html).toContain('data-listing-card-price-row="true"');
    expect(html).toContain('data-listing-card-characteristics="true"');
    expect(html).toContain("Velours");
    expect(html).toContain("Trois places");
    expect(html).toContain('data-listing-card-seller-identity="true"');
    expect(html).toContain('data-listing-card-seller-avatar="true"');
    expect(html).toContain("Agence Canopée");
    expect(html).toContain("Profil vérifié");
    expect(html).toMatch(/aria-label="[^"]*Velours[^"]*Agence Canopée/);
  });

  it("does not reserve empty horizontal detail zones", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{
          ...baseListing,
          characteristics: [],
          seller: undefined,
          publisherType: "private",
        }}
        href="/annonce/listing-card-test"
        variant="list"
        labels={labels}
        identityLabels={identityLabels}
      />,
    );

    expect(html).not.toContain('data-listing-card-characteristics="true"');
    expect(html).not.toContain('data-listing-card-seller-identity="true"');
  });

  it("keeps the richer decision fields and seller identity in hero mode", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={{
          ...baseListing,
          characteristicIcons: ["layers", "layout-grid"],
          seller: {
            ...baseListing.seller!,
            responseTimeLabel: "Répond généralement sous 2 h",
          },
        }}
        href="/annonce/listing-card-test"
        variant="hero"
        labels={labels}
        identityLabels={identityLabels}
      />,
    );

    expect(html).toContain('data-listing-card-variant="hero"');
    expect(html).toContain('data-listing-card-characteristics="true"');
    expect(html).toContain("Velours");
    expect(html).toContain("Trois places");
    expect(html).toContain('data-listing-card-seller-identity="true"');
    expect(html).toContain('data-listing-card-seller-avatar="true"');
    expect(html).toContain("Agence Canopée");
    expect(html).toContain("Répond généralement sous 2 h");
    expect(html).toContain("Profil vérifié");
  });

  it("renders a static preview without navigation or favorite mutation", () => {
    const html = renderToStaticMarkup(
      <ListingCard
        listing={baseListing}
        href="/annonce/preview"
        interactive={false}
        labels={labels}
        identityLabels={identityLabels}
        favoriteAction={
          <button type="button" aria-label="Ajouter aux favoris" />
        }
      />,
    );

    expect(html).not.toContain("<a ");
    expect(html).not.toContain("Ajouter aux favoris");
    expect(html).not.toContain('data-listing-card-actions="true"');
    expect(html).toContain('role="group"');
    expect(html).toContain(baseListing.title);
  });
});
