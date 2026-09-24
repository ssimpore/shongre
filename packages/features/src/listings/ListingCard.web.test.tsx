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
  photoCount: 4,
  deliveryAvailable: true,
  fulfillmentTypes: ["PHYSICAL"],
  requiresPhysicalDelivery: true,
  onlinePaymentAvailable: true,
  isNegotiable: true,
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
  sponsored: "Sponsorisé",
  featured: "À la une",
  urgent: "Urgent",
  promotion: "En promotion",
  delivery: "Livraison",
  digitalFulfillment: "Accès numérique",
  free: "Gratuit",
  negotiable: "Négociable",
  onRequest: "Prix sur demande",
  onlinePayment: "Paiement en ligne",
  imageUnavailable: "Image indisponible",
  photos: (count) => `${count} photos`,
  rating: (rating, count) => `Note ${rating} sur 5, ${count} avis`,
  verifiedSeller: "Vendeur vérifié",
  verifiedSellerShort: "Vérifié",
};

const identityLabels = {
  pro: "Pro",
  proAccessibility: "Vendeur professionnel",
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
  it("compacts photo-free cards even when a promotion badge is present", () => {
    const html = renderCard({
      ...baseListing,
      imageUrl: undefined,
      photoCount: 0,
    });
    expect(html).toContain("listing-card-no-media-overlay");
    expect(renderCard()).not.toContain("listing-card-no-media-overlay");
  });

  it.each(["grid", "compact", "showcase", "list", "hero"] as const)(
    "keeps category-aware capabilities in the content area (%s)",
    (variant) => {
      const html = renderToStaticMarkup(
        <ListingCard
          listing={{
            ...baseListing,
            imageUrl: undefined,
            photoCount: 1,
            fulfillmentTypes: ["FILE_DOWNLOAD"],
            requiresPhysicalDelivery: false,
          }}
          href="/annonce/listing-card-test"
          variant={variant}
          labels={labels}
          identityLabels={identityLabels}
        />,
      );
      const contentStart = html.indexOf('data-listing-card-content="true"');
      const media = html.slice(
        html.indexOf('data-listing-card-media="true"'),
        contentStart,
      );
      const body = html.slice(contentStart);
      const horizontal = variant === "list" || variant === "hero";
      const expectedLabels = horizontal
        ? ["Paiement en ligne", "Livraison", "Négociable", "Accès numérique"]
        : ["Paiement en ligne", "Accès numérique"];

      for (const label of expectedLabels) {
        expect(body).toContain(`aria-label="${label}"`);
        expect(body).toContain(`title="${label}"`);
        expect(body).toContain(`>${label}</span>`);
      }
      expect(media).not.toContain("data-listing-capability=");
      expect(body.match(/data-listing-capability=/g)).toHaveLength(
        horizontal ? 4 : 2,
      );
      expect(body.includes('data-listing-card-footer-facts="true"')).toBe(
        !horizontal,
      );
      expect(media).not.toContain("data-listing-card-photo-count=");
      expect(media).toContain('aria-label="Image indisponible"');
      expect(html).toMatch(
        /aria-label="[^"]*Paiement en ligne, Livraison, Accès numérique, Négociable/,
      );
    },
  );

  it.each(["grid", "list", "compact", "showcase", "hero"] as const)(
    "uses a payment-card glyph with the online-payment label in the %s variant",
    (variant) => {
      const html = renderToStaticMarkup(
        <ListingCard
          listing={baseListing}
          href="/annonce/listing-card-test"
          variant={variant}
          labels={labels}
          identityLabels={identityLabels}
        />,
      );
      expect(html).toContain('data-listing-capability="online_payment"');
      expect(html).toContain('title="Paiement en ligne"');
      expect(html).toContain("lucide-credit-card");
      expect(html).not.toContain("lucide-shield-check");
    },
  );

  it.each(["grid", "list", "compact", "showcase", "hero"] as const)(
    "announces and renders coexisting feature and sale badges in %s cards",
    (variant) => {
      const html = renderToStaticMarkup(
        <ListingCard
          listing={{
            ...baseListing,
            originalPrice: { amountMinor: 30000, currency: "EUR" },
          }}
          href="/annonce/listing-card-test"
          variant={variant}
          labels={labels}
          identityLabels={identityLabels}
        />,
      );
      expect(html).toContain('data-listing-badge="featured"');
      expect(html).toContain('data-listing-badge="promotion"');
      expect(html).toContain("lucide-flame");
      expect(html).toContain("lucide-tag");
      expect(html).toMatch(/aria-label="[^"]*À la une, En promotion/);
      expect(html).not.toContain('data-listing-badge="boosted"');
    },
  );

  it.each([
    ["search_bump", "boosted", "Boosté", "rocket"],
    ["sponsored_search", "sponsored", "Sponsorisé", "rocket"],
    ["urgent_badge", "urgent", "Urgent", "zap"],
  ] as const)(
    "renders %s with its own label and icon",
    (type, kind, label, icon) => {
      const html = renderCard({
        ...baseListing,
        promotion: { ...baseListing.promotion!, type },
      });
      expect(html).toContain(`data-listing-badge="${kind}"`);
      expect(html).toContain(label);
      expect(html).toContain(`lucide-${icon}`);
      expect(html).not.toContain('data-listing-badge="featured"');
      expect(html).not.toContain('data-listing-badge="promotion"');
    },
  );

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
    expect(price).toBeLessThan(meta);
    expect(html).toContain("Maison");
    expect(html).toContain("IKEA");
    expect(html).toContain("250 €");
    expect(html).toContain(">Pro<");
    expect(html).toContain("4,8");
    expect(html).toContain("(32)");
    expect(html).toContain("Lyon 3e");
    expect(html).toContain("il y a 2 h");
    expect(html).toMatch(/aria-label="[^"]*il y a 2 h/);
    expect(html).toContain("À la une");
    expect(html).toContain('data-listing-badge="featured"');
    expect(html).toContain("lucide-flame");
    expect(html).toContain('data-listing-card-footer-facts="true"');
    expect(html).toContain('data-listing-capability="online_payment"');
    expect(html).toContain('data-listing-capability="delivery"');
    expect(html).not.toContain('data-listing-capability="negotiable"');
    expect(html).toContain('data-listing-card-photo-count="true"');
    expect(html).toContain('aria-label="4 photos"');
    expect(html).toContain("fill-primary text-primary");
    expect(html).toContain('aria-label="Retirer des favoris"');
    expect(html).toContain("listing-card-media");
    expect(html).toContain("focus-within:ring-inset");
    expect(html).toContain('data-ui-pro-badge="true"');
    expect(html).not.toContain('data-ui-verification-badge="true"');
    expect(html).not.toContain("Vendeur vérifié");
  });

  it("keeps seller trust compact and scales long vertical titles to two lines", () => {
    const html = renderCard();
    const titleStart = html.indexOf('data-listing-card-title="true"');
    const titleEnd = html.indexOf("</h3>", titleStart);
    const titleMarkup = html.slice(titleStart, titleEnd);

    expect(html).toContain("Agence Canopée");
    expect(html).not.toContain('data-listing-card-characteristics="true"');
    expect(html).toContain('data-listing-card-photo-count="true"');
    expect(html).not.toContain('data-listing-card-delivery-overlay="true"');
    expect(html).not.toContain('data-listing-card-seller-avatar="true"');
    expect(html).toContain('data-listing-card-seller-summary="true"');
    expect(html).not.toContain('data-listing-card-original-price="true"');
    expect(html).not.toContain('data-listing-capability="negotiable"');
    expect(html).toContain("py-2");
    expect(titleMarkup).toContain(baseListing.title);
    expect(titleMarkup).toContain("text-sm");
    expect(titleMarkup).toContain("listing-card-title-vertical");
    expect(titleMarkup).toContain("font-semibold");
    expect(titleMarkup).not.toContain("truncate");
  });

  it.each(["grid", "compact", "showcase"] as const)(
    "places professional trust after metadata with one real rating in %s cards",
    (variant) => {
      const html = renderToStaticMarkup(
        <ListingCard
          listing={baseListing}
          href="/annonce/test"
          variant={variant}
          labels={labels}
          identityLabels={identityLabels}
        />,
      );
      const summary = html.indexOf('data-listing-card-seller-summary="true"');
      const price = html.indexOf('data-listing-card-price-row="true"');
      const priceRowMarkup = html.slice(
        html.lastIndexOf("<div", price),
        html.indexOf(">", price),
      );
      expect(html).not.toContain('data-listing-card-seller-identity="true"');
      expect(summary).toBeGreaterThan(
        html.indexOf('data-listing-card-meta="true"'),
      );
      expect(summary).toBeGreaterThan(price);
      expect(html.indexOf('data-ui-pro-badge="true"')).toBeGreaterThan(price);
      expect(html).not.toContain('data-ui-verification-badge="true"');
      expect(html.match(/data-listing-card-rating="true"/g)).toHaveLength(1);
      expect(html.indexOf('data-listing-card-rating="true"')).toBeGreaterThan(
        price,
      );
      const summaryMarkup = html.slice(
        html.lastIndexOf("<span", summary),
        html.indexOf(">", summary),
      );
      expect(summaryMarkup).not.toContain("ml-auto");
      expect(summaryMarkup).toContain("min-h-control-target");
      expect(priceRowMarkup).toContain("flex-wrap");
    },
  );

  it("shows a brand separator only when a real brand exists", () => {
    const withBrand = renderCard();
    const withoutBrand = renderCard({ ...baseListing, brandLabel: undefined });

    expect(withBrand).toMatch(/Maison[\s\S]*?·[\s\S]*?IKEA/);
    expect(withoutBrand).not.toMatch(/Maison[\s\S]*?·[\s\S]*?IKEA/);
    expect(withoutBrand).not.toContain("IKEA");
  });

  it("lets long prices and seller facts wrap without truncating the price", () => {
    const html = renderCard({
      ...baseListing,
      price: { amountMinor: 123_456_789_000, currency: "EUR" },
    });
    const priceStart = html.indexOf('data-listing-card-current-price="true"');
    const priceMarkup = html.slice(
      html.lastIndexOf("<span", priceStart),
      html.indexOf("</span>", priceStart),
    );
    const summaryStart = html.indexOf(
      'data-listing-card-seller-summary="true"',
    );
    const summaryMarkup = html.slice(
      summaryStart,
      html.indexOf(">", summaryStart),
    );

    expect(priceMarkup).toContain("flex-auto");
    expect(priceMarkup).toContain("break-words");
    expect(priceMarkup).not.toContain("truncate");
    expect(summaryMarkup).toContain("min-h-control-target");
    expect(summaryMarkup).not.toContain("overflow-hidden");
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
    expect(html).not.toContain('data-ui-verification-badge="true"');
    expect(html).not.toContain("Particulier");
    expect(html).toContain('data-listing-card-rating="true"');
    expect(html).toContain("4,9");
    expect(html).toContain("1 234");
    expect(html.match(/aria-label="Note 4,9 sur 5, 1 234 avis"/g)).toHaveLength(
      1,
    );
  });

  it("places verified status in the trust row for an individual seller", () => {
    const html = renderCard({
      ...baseListing,
      publisherType: "private",
      seller: {
        ...baseListing.seller!,
        sellerType: "individual",
        isIdentityVerified: true,
        isBusinessVerified: false,
      },
    });
    const media = html.indexOf('data-listing-card-media="true"');
    const content = html.indexOf('data-listing-card-content="true"');
    const meta = html.indexOf('data-listing-card-meta="true"');
    const verificationBadge = html.indexOf('data-ui-verification-badge="true"');
    const summary = html.indexOf('data-listing-card-seller-summary="true"');
    expect(summary).toBeGreaterThan(meta);
    expect(verificationBadge).toBeGreaterThan(summary);
    expect(html).not.toContain('data-ui-verified-icon="true"');
    expect(html).not.toContain('data-listing-card-seller-identity="true"');
    expect(html.slice(media, content)).not.toContain(
      'data-ui-verified-icon="true"',
    );
    expect(html).toContain("Vendeur vérifié");
    expect(html).toContain(">Vérifié<");
    expect(html).not.toContain("Particulier");
    expect(html).not.toContain('data-ui-pro-badge="true"');
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
    expect(html).not.toContain('data-ui-verification-badge="true"');
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
    expect(html).toContain("Paiement en ligne");
    expect(html).toContain("Livraison");
    expect(html).toContain("Négociable");
    expect(html).not.toContain('data-ui-verification-badge="true"');
    expect(html).not.toContain("Vendeur vérifié");
    expect(html).toMatch(/aria-label="[^"]*Velours[^"]*Agence Canopée/);
    const titleStart = html.indexOf('data-listing-card-title="true"');
    const titleEnd = html.indexOf("</h3>", titleStart);
    const titleMarkup = html.slice(titleStart, titleEnd);
    expect(titleMarkup).toContain("truncate");
    expect(titleMarkup).toContain("text-card-title");
    expect(titleMarkup).not.toContain("line-clamp-2");
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

  it("omits capability and media-detail zones when no applicable data exists", () => {
    const html = renderCard({
      ...baseListing,
      characteristics: [],
      photoCount: 1,
      deliveryAvailable: false,
      fulfillmentTypes: ["PHYSICAL"],
      requiresPhysicalDelivery: true,
      onlinePaymentAvailable: false,
      isNegotiable: false,
      seller: {
        ...baseListing.seller!,
        isIdentityVerified: false,
        isBusinessVerified: false,
      },
    });

    expect(html).not.toContain('data-listing-card-capabilities="true"');
    expect(html).not.toContain('data-listing-card-footer-facts="true"');
    expect(html).not.toContain('data-listing-card-media-details="true"');
    expect(html).not.toContain('data-listing-card-photo-count="true"');
  });

  it("fills the vertical footer with category characteristics when commerce capabilities are absent", () => {
    const html = renderCard({
      ...baseListing,
      deliveryAvailable: false,
      onlinePaymentAvailable: false,
      isNegotiable: false,
      seller: {
        ...baseListing.seller!,
        isIdentityVerified: false,
        isBusinessVerified: false,
      },
    });

    expect(html).toContain('data-listing-card-footer-facts="true"');
    expect(html).toContain('data-listing-characteristic="Velours"');
    expect(html).toContain('data-listing-characteristic="Trois places"');
    expect(html).not.toContain("data-listing-capability=");
  });

  it("does not expose an internal monetary storage unit as a category fact", () => {
    const html = renderCard({
      ...baseListing,
      characteristics: ["Bricolage & rénovation", "65 currency_minor"],
      deliveryAvailable: false,
      onlinePaymentAvailable: false,
      isNegotiable: false,
      seller: undefined,
    });

    expect(html).toContain(
      'data-listing-characteristic="Bricolage &amp; rénovation"',
    );
    expect(html).not.toContain("currency_minor");
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
    expect(html).not.toContain('data-ui-verification-badge="true"');
    expect(html).not.toContain("Vendeur vérifié");
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
