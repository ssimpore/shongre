import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { taxonomyService } from "../../../domains/taxonomy/taxonomy.service";
import type { Listing } from "../../../types";
import type { HomeUniverseListingGroup } from "../useHomeUniverseListings";
import { HomeUniverseExplorerContent } from "./HomeUniverseExplorer";

vi.mock("../../../design-system/primitives/ListingCard", () => ({
  ListingCard: ({
    listing,
    variant,
  }: {
    listing: Listing;
    variant: string;
  }) => (
    <article data-listing-card="true" data-listing-card-variant={variant}>
      <a href={`/annonce/${listing.id}`}>{listing.title}</a>
    </article>
  ),
}));

const listing = (id: string, title: string): Listing =>
  ({ id, title }) as Listing;

function readyGroup(
  rootSlug: string,
  listings: Listing[],
): HomeUniverseListingGroup {
  const root = taxonomyService.getNodeBySlug(rootSlug);
  if (!root) throw new Error(`Unknown test taxonomy root: ${rootSlug}`);
  return { root, status: "ready", listings };
}

describe("HomeUniverseExplorer", () => {
  it("renders corresponding showcase listings for every configured universe", () => {
    const groups = [
      readyGroup("maison-jardin", [
        listing("home-1", "Table ronde en teck"),
        listing("home-2", "Machine à café"),
      ]),
      readyGroup("vehicules", [listing("vehicle-1", "Peugeot 208")]),
      readyGroup("mode", [listing("fashion-1", "Manteau en laine")]),
    ];

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HomeUniverseExplorerContent groups={groups} onRetry={() => {}} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Explorez par univers");
    expect(markup).toContain("Trouvez rapidement ce qui vous intéresse");
    expect(markup.match(/data-home-universe-group=/g)).toHaveLength(3);
    expect(markup.match(/data-listing-card="true"/g)).toHaveLength(4);
    expect(markup.match(/data-listing-card-variant="showcase"/g)).toHaveLength(
      4,
    );

    expect(markup).toContain(">Maison &amp; Jardin<");
    expect(markup).toContain(">Véhicules<");
    expect(markup).toContain(">Mode<");
    expect(markup).toContain(">Table ronde en teck<");
    expect(markup).toContain(">Peugeot 208<");
    expect(markup).toContain(">Manteau en laine<");

    expect(markup).toContain('href="/categorie/maison-jardin"');
    expect(markup).toContain('href="/categorie/vehicules"');
    expect(markup).toContain('href="/categorie/mode"');
    expect(markup).toContain('href="/annonce/home-1"');
    expect(markup).not.toContain("data-home-universe-item");
    expect(markup).not.toContain("home-universe-sprite");
  });

  it("keeps each universe available while its listings load, fail, or are empty", () => {
    const home = taxonomyService.getNodeBySlug("maison-jardin");
    const vehicles = taxonomyService.getNodeBySlug("vehicules");
    const fashion = taxonomyService.getNodeBySlug("mode");
    if (!home || !vehicles || !fashion) {
      throw new Error("Expected homepage taxonomy roots to be available");
    }

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HomeUniverseExplorerContent
          groups={[
            { root: home, status: "empty", listings: [] },
            { root: vehicles, status: "error", listings: [] },
            { root: fashion, status: "loading", listings: [] },
          ]}
          onRetry={() => {}}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Aucune annonce disponible");
    expect(markup).toContain(
      "De nouvelles annonces seront bientôt proposées dans cet univers.",
    );
    expect(markup).toContain("Une erreur est survenue");
    expect(markup).toContain("Réessayer");
    expect(markup.match(/listing-card-showcase-skeleton/g)).toHaveLength(6);
  });
});
