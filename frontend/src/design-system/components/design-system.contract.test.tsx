import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VerificationBadge } from "@shongre/ui/web";
import { Button } from "../primitives/Button";
import { Input, Switch } from "../primitives/FormField";
import { FilterPanel, FilterPanelToggle } from "../primitives/FilterPanel";
import {
  SearchActiveFiltersBar,
  SearchResultsToolbar,
  SearchSortControl,
  countActiveSearchParams,
} from "../primitives/SearchPageControls";
import { Surface } from "../primitives/Layout";
import { EmptyState, Notice } from "./Feedback";
import { OnboardingPreparationPage } from "./OnboardingPreparationPage";
import { ListingCardSkeleton } from "./Skeleton";

describe("design-system representative states", () => {
  it("renders control variants through typed APIs", () => {
    const html = renderToStaticMarkup(
      <>
        <Button variant="primary" size="sm">
          Publier
        </Button>
        <Button variant="danger" isLoading>
          Supprimer
        </Button>
        <VerificationBadge label="Vérifié" />
        <Input aria-label="Recherche" error />
        <Switch checked onChange={() => undefined} label="Notifications" />
      </>,
    );

    expect(html).toContain("h-control-sm");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="switch"');
    expect(html).toContain("absolute inset-0");
    expect(html).toContain("min-h-control-touch");
  });

  it("renders shared surface, feedback, empty, and loading states", () => {
    const html = renderToStaticMarkup(
      <Surface elevation="dropdown">
        <Notice variant="warning" title="Attention">
          Vérifiez les informations.
        </Notice>
        <EmptyState
          title="Aucun résultat"
          description="Modifiez vos filtres."
          action={null}
        />
        <ListingCardSkeleton />
      </Surface>,
    );

    expect(html).toContain("shadow-dropdown");
    expect(html).toContain("bg-warning-surface");
    expect(html).toContain("Aucun résultat");
    expect(html).toContain('aria-hidden="true"');
  });

  it("uses the authentication-flow control height for onboarding actions", () => {
    const html = renderToStaticMarkup(
      <OnboardingPreparationPage
        eyebrow="Votre annonce"
        title="Avant de commencer"
        description="Préparez votre annonce."
        checklistTitle="À garder sous la main"
        items={[]}
        actionLabel="Reprendre mon annonce"
        durationLabel="Environ 5 minutes"
        statusLabel="Votre brouillon est prêt."
        onStart={() => undefined}
      />,
    );

    expect(html).toContain("h-control-touch");
    expect(html).not.toContain("h-control-lg");
  });

  it("renders the canonical filter shell for sidebars and drawers", () => {
    const sidebar = renderToStaticMarkup(
      <FilterPanel title="Filtres Auto" onReset={() => undefined}>
        <label>
          Marque
          <select aria-label="Marque" />
        </label>
      </FilterPanel>,
    );
    const drawer = renderToStaticMarkup(
      <FilterPanel
        presentation="drawer"
        onReset={() => undefined}
        footer={<button type="button">Voir les résultats</button>}
      >
        <span>Filtres adaptés</span>
      </FilterPanel>,
    );

    expect(sidebar).toContain('data-filter-panel="surface"');
    expect(sidebar).toContain("rounded-listing-card");
    expect(sidebar).toContain("divide-y");
    expect(sidebar).toContain("divide-border-subtle");
    expect(sidebar).toContain("w-full");
    expect(sidebar).toContain("Filtres Auto");
    expect(sidebar).toContain("Réinitialiser");
    expect(drawer).toContain('data-filter-panel="drawer"');
    expect(drawer).toContain("Voir les résultats");
  });

  it("renders the shared filter visibility controls", () => {
    const expanded = renderToStaticMarkup(
      <FilterPanelToggle
        isExpanded
        controls="vehicle-filters"
        onToggle={() => undefined}
      />,
    );
    const drawer = renderToStaticMarkup(
      <FilterPanelToggle
        isExpanded={false}
        controls="vehicle-filter-drawer"
        presentation="drawer"
        activeCount={3}
        onToggle={() => undefined}
      />,
    );

    expect(expanded).toContain('aria-controls="vehicle-filters"');
    expect(expanded).toContain('aria-expanded="true"');
    /* The control keeps the panel's own word in both states. It used to read
       "Masquer" once open, which removed the only label a reader could search
       for to get the filters back. The action is still announced. */
    expect(expanded).toContain("Filtres");
    expect(expanded).toContain("Masquer les filtres");
    expect(expanded).not.toContain(">Masquer<");
    expect(drawer).toContain('aria-controls="vehicle-filter-drawer"');
    expect(drawer).toContain('aria-expanded="false"');
    expect(drawer).toContain("Ouvrir les filtres de recherche");
    expect(drawer).toContain(">3<");
  });

  it("renders the canonical active-filter summary and results toolbar", () => {
    const html = renderToStaticMarkup(
      <>
        <SearchActiveFiltersBar onClear={() => undefined}>
          <span>Paris</span>
        </SearchActiveFiltersBar>
        <SearchResultsToolbar
          resultLabel="12 annonces"
          desktopFilterPanelId="desktop-filters"
          mobileFilterPanelId="mobile-filters"
          desktopFiltersExpanded
          mobileFiltersExpanded={false}
          activeFilterCount={2}
          onToggleDesktopFilters={() => undefined}
          onOpenMobileFilters={() => undefined}
          actions={<button type="button">Sauvegarder</button>}
          viewControls={<button type="button">Grille</button>}
          sortControl={
            <SearchSortControl>
              <button type="button">Plus récentes</button>
            </SearchSortControl>
          }
        />
      </>,
    );

    expect(html).toContain("data-search-active-filters");
    expect(html).toContain("data-search-results-toolbar");
    expect(html.match(/rounded-listing-card/g)).toHaveLength(2);
    expect(html).toContain('aria-controls="desktop-filters"');
    expect(html).toContain('aria-controls="mobile-filters"');
    expect(html).toContain("Sauvegarder");
    expect(html).toContain("Plus récentes");
  });

  it("counts only configured non-empty search parameters", () => {
    const params = new URLSearchParams(
      "q=velo&city=&sort=newest&fuel=electric",
    );

    expect(countActiveSearchParams(params, ["q", "city", "fuel"])).toBe(2);
  });
});
