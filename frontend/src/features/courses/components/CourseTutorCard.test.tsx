import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TutorSearchItem } from "@shongre/contracts/courses";
import {
  DEMO_COURSE_OFFERS,
  DEMO_TUTORS,
} from "../../../mocks/coursesDemoData";

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

import { CourseTutorCard, presentCourseTutorCard } from "./CourseTutorCard";

const tutor = DEMO_TUTORS.find((candidate) => candidate.organizationId)!;
const offer = DEMO_COURSE_OFFERS.find(
  (candidate) => candidate.tutorProfileId === tutor.id,
)!;
const hourlyPrice = offer.pricingOptions.find(
  (option) => option.type === "hourly" && option.isActive,
)!.price;
const item: TutorSearchItem = {
  tutor,
  offer,
  subjectLabel: "Mathématiques",
  levelLabels: ["Collège", "Lycée"],
  fromPrice: hourlyPrice,
  relevanceReasons: ["Matière"],
  isSaved: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("course tutor listing card", () => {
  it("uses the loaded offer price, professional status and aggregate rating", () => {
    const listing = presentCourseTutorCard(item, "fr-FR", "FR");

    expect(listing).toMatchObject({
      id: offer.listingId,
      title: offer.title,
      city: offer.serviceArea?.publicLocationLabel,
      marketCode: "FR",
      categoryLabel: "Éducation",
      publisherType: "professional",
      priceKind: "amount",
      price: hourlyPrice,
      seller: {
        sellerType: "pro",
        rating: tutor.rating,
        reviewCount: tutor.reviewCount,
      },
    });
    expect(listing.priceLabel?.replace(/\s/gu, " ")).toContain("/ h");
    expect(listing.brandLabel).toBeUndefined();
  });

  it("does not invent a score when the aggregate rating is absent", () => {
    const withoutRating: TutorSearchItem = {
      ...item,
      tutor: { ...item.tutor, rating: undefined, reviewCount: 3 },
    };

    expect(
      presentCourseTutorCard(withoutRating, "fr-FR", "FR").seller,
    ).toMatchObject({
      rating: undefined,
      reviewCount: 3,
    });
  });

  it("does not expose an inactive course price", () => {
    const inactivePricing: TutorSearchItem = {
      ...item,
      offer: {
        ...item.offer,
        pricingOptions: item.offer.pricingOptions.map((option) => ({
          ...option,
          isActive: false,
        })),
      },
      // The transport projection remains required for compatibility, but price
      // visibility belongs to the active offer options themselves.
      fromPrice: hourlyPrice,
    };

    expect(
      presentCourseTutorCard(inactivePricing, "fr-FR", "FR"),
    ).toMatchObject({
      price: undefined,
      priceKind: "unpriced",
      priceLabel: undefined,
    });
  });

  it("never presents an in-person offer without an area as online", () => {
    const inPersonWithoutArea: TutorSearchItem = {
      ...item,
      tutor: { ...item.tutor, serviceArea: undefined },
      offer: {
        ...item.offer,
        deliveryModes: ["in_person"],
        serviceArea: undefined,
      },
    };
    const onlineWithoutArea: TutorSearchItem = {
      ...inPersonWithoutArea,
      offer: { ...inPersonWithoutArea.offer, deliveryModes: ["online"] },
    };

    expect(
      presentCourseTutorCard(inPersonWithoutArea, "fr-FR", "FR").city,
    ).toBe("France");
    expect(
      presentCourseTutorCard(inPersonWithoutArea, "fr-FR", "FR").city,
    ).not.toBe("En ligne");
    expect(presentCourseTutorCard(onlineWithoutArea, "fr-FR", "FR").city).toBe(
      "En ligne",
    );
  });

  it("shows Boosté only for active exact-market promotion proof", () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-09-06T12:00:00.000Z"),
    );
    const promoted: TutorSearchItem = {
      ...item,
      resolvedPromotion: {
        state: "active",
        type: "sponsored_search",
        marketCode: "FR",
        source: "purchase",
        sourceId: "promotion-proof-course",
        label: "Sponsorisé",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-10-01T00:00:00.000Z",
        promotedAt: "2026-09-01T00:00:00.000Z",
      },
    };

    expect(presentCourseTutorCard(promoted, "fr-FR", "FR")).toMatchObject({
      isFeatured: true,
      promotion: {
        state: "active",
        type: "sponsored_search",
        marketCode: "FR",
        source: "purchase",
        sourceId: "promotion-proof-course",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-10-01T00:00:00.000Z",
      },
    });
    expect(
      presentCourseTutorCard(
        {
          ...item,
          tutor: { ...item.tutor, isFeatured: true },
        },
        "fr-FR",
        "FR",
      ).isFeatured,
    ).toBe(false);
    expect(
      presentCourseTutorCard(
        {
          ...promoted,
          resolvedPromotion: {
            ...promoted.resolvedPromotion!,
            marketCode: "BE",
          },
        },
        "fr-FR",
        "FR",
      ).isFeatured,
    ).toBe(false);
    expect(
      presentCourseTutorCard(
        {
          ...promoted,
          resolvedPromotion: {
            ...promoted.resolvedPromotion!,
            endsAt: "2026-09-06T12:00:00.000Z",
          },
        },
        "fr-FR",
        "FR",
      ).isFeatured,
    ).toBe(false);

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <CourseTutorCard
          item={promoted}
          isCompared={false}
          isSaved={false}
          onToggleCompare={vi.fn()}
          onToggleSaved={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(html).toContain("Boosté");
  });

  it("renders the canonical listing link without the former description or action buttons", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <CourseTutorCard
          item={item}
          isCompared={false}
          isSaved={false}
          onToggleCompare={vi.fn()}
          onToggleSaved={vi.fn()}
        />
      </MemoryRouter>,
    );
    const normalized = html.replace(/\s/gu, " ");

    expect(html).toContain('data-listing-card-consumer="courses"');
    expect(html).toContain('data-listing-card="true"');
    expect(html).toContain(`href="/education/professeur/${tutor.slug}"`);
    expect(html).toContain("Éducation");
    expect(normalized).toContain("/ h");
    expect(html).toContain(">Pro<");
    expect(html).toContain('data-listing-card-rating="true"');
    expect(html).toContain("Comparer");
    expect(html).not.toContain(tutor.teachingApproach);
    expect(html).not.toContain("Voir le profil");
    expect(html).not.toContain("Contacter");
  });
});
