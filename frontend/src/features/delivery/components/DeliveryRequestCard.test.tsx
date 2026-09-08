import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { DeliveryPublicRequest } from "@shongre/contracts/delivery";

vi.mock("../../../app/providers/MarketLocationProvider", () => ({
  useMarketLocation: () => ({
    activeMarket: { code: "FR" },
    currentLocale: "fr-FR",
    convertMoney: (money: { amountMinor: number; currency: string }) => ({
      original: money,
      display: money,
      converted: false,
      estimated: false,
    }),
  }),
}));

vi.mock("../../../app/providers/ToastProvider", () => ({
  useToast: () => ({ error: vi.fn() }),
}));

vi.mock("../../../app/providers/FavoritesProvider", () => ({
  useFavorites: () => ({
    canModifyFavorites: false,
    favoriteLoadState: "ready",
    isFavorite: () => false,
    refreshFavorites: vi.fn(),
    toggleFavorite: vi.fn(),
  }),
}));

vi.mock("../../../i18n/I18nProvider", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { rating?: string }) => {
      const labels: Record<string, string> = {
        "ui.listingCard.boosted": "Boosté",
        "ui.listingCard.free": "Gratuit",
        "ui.listingCard.onRequest": "Prix sur demande",
        "ui.listingCard.imageUnavailable": "Image indisponible",
        "ui.listingCard.ajouterAuxFavoris": "Ajouter aux favoris",
        "ui.listingCard.retirerDesFavoris": "Retirer des favoris",
        "ui.identityStatus.pro.short": "Pro",
        "ui.identityStatus.pro.seller": "Vendeur professionnel",
      };
      if (key === "ui.listingCard.noteAvis") {
        return `Note ${values?.rating} sur 5, {count} avis`;
      }
      return labels[key] || key;
    },
  }),
}));

import {
  DeliveryRequestCard,
  presentDeliveryRequestCard,
} from "./DeliveryRequestCard";
import { resolveDeliveryFavoriteAccountId } from "../useDeliveryRequestFavorites";

const request: DeliveryPublicRequest = {
  id: "418711cb-aee0-4fa3-a102-8ec6ea2a2cb8",
  slug: "livrer-un-colis-fragile",
  marketCode: "FR",
  origin: "standalone",
  status: "open",
  title: "Livrer un colis fragile",
  description: "Cette description détaillée ne doit pas apparaître.",
  pickupLocality: { city: "Paris", postalCode: "75011" },
  dropoffLocality: { city: "Boulogne", postalCode: "92100" },
  pickupWindow: {
    startsAt: "2026-09-08T09:00:00.000Z",
    endsAt: "2026-09-08T11:00:00.000Z",
  },
  deliveryWindow: {
    startsAt: "2026-09-08T12:00:00.000Z",
    endsAt: "2026-09-08T16:00:00.000Z",
  },
  package: {
    type: "Colis fragile",
    count: 1,
    approximateWeightGrams: 5_000,
    handlingRequirements: ["Fragile"],
    requiredVehicleType: "bicycle",
    loadingAssistanceRequired: false,
  },
  budget: { amountMinor: 4_500, currency: "EUR" },
  requester: { displayName: "Camille", verified: true },
  applicationCount: 12,
  expiresAt: "2026-09-30T20:00:00.000Z",
  publishedAt: "2026-09-06T08:00:00.000Z",
  version: 1,
  taxonomy: {
    revision: 12,
    categoryId: "services.delivery.requests",
    categorySlug: "livraison-coursier",
    categoryLabels: { "fr-FR": "Livraison & coursier" },
    rootId: "services",
    rootSlug: "services",
    rootLabels: { "fr-FR": "Services publiés" },
    path: [],
  },
};

describe("delivery listing card", () => {
  it("projects the public request through the compact listing contract", () => {
    const listing = presentDeliveryRequestCard(request, "fr-FR", "FR");

    expect(listing).toMatchObject({
      id: `delivery_${request.id}`,
      title: request.title,
      priceKind: "amount",
      price: { amountMinor: 4_500, currency: "EUR" },
      city: "Paris",
      marketCode: "FR",
      categoryLabel: "Services publiés",
      publishedAt: request.publishedAt,
      publisherType: "private",
    });
    expect(listing.imageUrl).toBeUndefined();
    expect(listing.brandLabel).toBeUndefined();
    expect(
      presentDeliveryRequestCard(
        { ...request, taxonomy: undefined },
        "fr-FR",
        "FR",
      ).categoryLabel,
    ).toBe("");
    expect(() => presentDeliveryRequestCard(request, "fr-BE", "BE")).toThrow(
      "is not published in market BE",
    );
  });

  it("renders only the shared card anatomy and the canonical request link", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DeliveryRequestCard request={request} onFavorite={vi.fn()} />
      </MemoryRouter>,
    );
    const normalized = html.replace(/\s/gu, " ");

    expect(html).toContain('data-listing-card-consumer="delivery"');
    expect(html).toContain('data-listing-card="true"');
    expect(html).toContain(`href="/livraison/demande/${request.id}"`);
    expect(normalized).toContain("45 €");
    expect(html).toContain("Services");
    expect(html).toContain(request.title);
    expect(html).toContain('aria-label="Image indisponible"');
    expect(html).not.toContain(request.description);
    expect(html).not.toContain(request.package.type);
    expect(html).not.toContain("Voir la demande");
    expect(html).toContain('data-listing-card-actions="true"');
    expect(html).toContain(
      `aria-label="Ajouter aux favoris : ${request.title}"`,
    );
  });

  it("omits private favorite state and actions for read-only Staff", () => {
    expect(
      resolveDeliveryFavoriteAccountId("staff-user", true),
    ).toBeUndefined();

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DeliveryRequestCard request={request} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('data-listing-card-actions="true"');
    expect(html).not.toContain("Ajouter aux favoris");
  });
});
