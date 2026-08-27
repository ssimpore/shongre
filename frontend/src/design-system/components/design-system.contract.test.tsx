import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../primitives/Button";
import { Badge } from "../primitives/Badge";
import { Input, Switch } from "../primitives/FormField";
import { FilterPanel } from "../primitives/FilterPanel";
import { Surface } from "../primitives/Layout";
import { EmptyState, Notice } from "./Feedback";
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
        <Badge variant="verified">Vérifié</Badge>
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
    expect(sidebar).toContain("rounded-card");
    expect(sidebar).toContain("Filtres Auto");
    expect(sidebar).toContain("Réinitialiser");
    expect(drawer).toContain('data-filter-panel="drawer"');
    expect(drawer).toContain("Voir les résultats");
  });
});
