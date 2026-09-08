import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  createDefaultHomepageConfiguration,
  resolveHomepageConfiguration,
} from "@shongre/contracts/homepage";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import type { Listing } from "../../../types";
import {
  HomeUniverseExplorer,
  resolveUniverseGroups,
} from "./HomeUniverseExplorer";

vi.mock("../../../app/providers/MarketLocationProvider", () => ({
  useMarketLocation: () => ({ marketContext: null }),
}));

vi.mock("../../../design-system/primitives/ListingCard", () => ({
  ListingCard: ({ listing }: { listing: Listing }) => (
    <article data-listing-card="true">{listing.title}</article>
  ),
}));

function universeSection(): HomepageSectionView {
  const section = resolveHomepageConfiguration(
    createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
      now: "2026-09-01T00:00:00.000Z",
    }),
    new Date("2026-09-01T00:00:00.000Z"),
  ).sections.find((candidate) => candidate.type === "universe_explorer");
  if (!section) throw new Error("Expected universe section");
  return {
    ...section,
    status: "ready",
    universeGroups: [
      {
        ...section.settings.universeSubsections![0]!,
        status: "ready",
        eligibleListingCount: 1,
        suppressed: false,
        listings: [{ id: "home-1", title: "Table ronde en teck" } as Listing],
      },
      {
        ...section.settings.universeSubsections![1]!,
        status: "ready",
        eligibleListingCount: 1,
        suppressed: false,
        listings: [{ id: "vehicle-1", title: "Peugeot 208" } as Listing],
      },
    ],
  };
}

describe("HomeUniverseExplorer", () => {
  it("joins only API-resolved taxonomy roots to backend universe groups", () => {
    const groups = resolveUniverseGroups(
      universeSection(),
      new Map([
        [
          "home_garden",
          {
            id: "home_garden",
            sourceKey: "home_garden",
            level: 0,
            slug: "maison",
            labels: { "fr-FR": "Maison" },
            shortLabels: { "fr-FR": "Maison" },
            iconName: "Home",
            sortOrder: 0,
            status: "active",
            publishable: true,
            sellerEligibility: {
              individualAllowed: true,
              professionalAllowed: true,
            },
            marketAvailability: [],
            seo: { indexable: true },
          },
        ],
      ]) as never,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.categoryId).toBe("home_garden");
    expect(groups[0]?.listings[0]?.title).toBe("Table ronde en teck");
    expect(groups[0]?.root.slug).toBe("maison");
  });

  it("renders a retry state when the backend cannot resolve listing data", () => {
    const section = { ...universeSection(), status: "error" as const };
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HomeUniverseExplorer section={section} onRetry={() => {}} />
      </MemoryRouter>,
    );
    expect(markup).toContain("Une erreur est survenue");
    expect(markup).toContain("Réessayer");
  });
});
