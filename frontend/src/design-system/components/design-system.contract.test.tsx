import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VerificationBadge } from "@shongre/ui/web";
import { Button } from "../primitives/Button";
import { Input, Switch } from "../primitives/FormField";
import {
  FilterPanel,
  FilterPanelToggle,
  SearchFilterDrawer,
} from "../primitives/FilterPanel";
import {
  SearchActiveFiltersBar,
  SearchResultsToolbar,
  SearchSortControl,
  countFittingSearchFilterTriggers,
  countActiveSearchParams,
  useSearchFilterDisclosure,
} from "../primitives/SearchPageControls";
import { Surface } from "../primitives/Layout";
import { EmptyState, Notice } from "./Feedback";
import { OnboardingPreparationPage } from "./OnboardingPreparationPage";
import { ListingCardSkeleton } from "./Skeleton";

function DefaultSearchFilterDisclosureToolbar() {
  const disclosure = useSearchFilterDisclosure();
  return (
    <SearchResultsToolbar
      resultLabel="12 annonces"
      filterPanelId="search-filters"
      filtersExpanded={disclosure.filtersExpanded}
      onOpenFilters={disclosure.openFilters}
    />
  );
}

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

    expect(html).toContain("min-h-control-md");
    expect(html).not.toContain("h-control-lg");
  });

  it("renders the canonical right-side search filter drawer", () => {
    const drawer = renderToStaticMarkup(
      <SearchFilterDrawer isOpen onClose={() => undefined} title="Filtres Auto">
        <FilterPanel
          onReset={() => undefined}
          footer={<button type="button">Voir les résultats</button>}
        >
          <fieldset data-filter-section="make">
            <legend>Marque</legend>
          </fieldset>
        </FilterPanel>
      </SearchFilterDrawer>,
    );

    expect(drawer).toContain('data-filter-panel="drawer"');
    expect(drawer).toContain('data-filter-section="make"');
    expect(drawer).toContain("slide-in-from-right");
    expect(drawer).toContain("Filtres Auto");
    expect(drawer).toContain("Réinitialiser");
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
    expect(drawer).toContain("sr-only sm:not-sr-only");
    expect(drawer).toContain(">3<");
  });

  it("renders the canonical active-filter summary and results toolbar", () => {
    const html = renderToStaticMarkup(
      <>
        <SearchActiveFiltersBar onClear={() => undefined}>
          <span>Paris</span>
        </SearchActiveFiltersBar>
        <SearchResultsToolbar
          title="Toutes les annonces"
          resultLabel="12 annonces"
          resultDescription="Découvrez les annonces disponibles."
          filterPanelId="search-filters"
          filtersExpanded
          filterTriggers={[
            { sectionId: "category", label: "Catégories", active: true },
          ]}
          activeFilterCount={2}
          onOpenFilters={() => undefined}
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
    expect(html).toContain("Toutes les annonces</h1>");
    expect(html).toContain("Découvrez les annonces disponibles.");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-controls="search-filters"');
    expect(html).toContain("data-search-filter-rail");
    expect(html).toContain('data-filter-trigger="category"');
    expect(html).toContain("Tous les filtres");
    expect(html).toContain('data-search-filter-overflow-count="0"');
    expect(html).toContain("Sauvegarder");
    expect(html).toContain("Plus récentes");
    expect(html).toContain(
      'data-search-filter-overflow-count="0" class="hidden min-w-0 flex-1 items-center gap-2 overflow-hidden',
    );
    expect(html).toContain("order-4");
  });

  it("keeps only complete quick filters beside the all-filters action", () => {
    expect(countFittingSearchFilterTriggers(460, [120, 90, 140], 110, 8)).toBe(
      2,
    );
    expect(countFittingSearchFilterTriggers(500, [120, 90, 140], 110, 8)).toBe(
      3,
    );
    expect(countFittingSearchFilterTriggers(100, [120], 110, 8)).toBe(0);
  });

  it("keeps shared search filters closed by default", () => {
    const html = renderToStaticMarkup(<DefaultSearchFilterDisclosureToolbar />);

    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).toContain("Afficher les filtres");
  });

  it("counts only configured non-empty search parameters", () => {
    const params = new URLSearchParams(
      "q=velo&city=&sort=newest&fuel=electric",
    );

    expect(countActiveSearchParams(params, ["q", "city", "fuel"])).toBe(2);
  });
});
