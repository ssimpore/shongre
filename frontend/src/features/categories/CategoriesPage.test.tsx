import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { RootTaxonomyCategoriesState } from "../../hooks/useRootTaxonomyCategories";
import { CategoriesPage } from "./CategoriesPage";

const state = vi.hoisted(
  () =>
    ({
      categories: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    }) as RootTaxonomyCategoriesState,
);
vi.mock("../../hooks/useRootTaxonomyCategories", () => ({
  useRootTaxonomyCategories: () => state,
}));
vi.mock("../../hooks/usePageMeta", () => ({ usePageMeta: vi.fn() }));

const render = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <CategoriesPage />
    </MemoryRouter>,
  );

describe("compact category catalogue", () => {
  beforeEach(() =>
    Object.assign(state, { categories: [], isLoading: false, error: null }),
  );

  it("renders only projected categories with compact labels and section counts", () => {
    state.categories = [
      {
        id: "root",
        slug: "materiel-professionnel",
        name: "Matériel professionnel",
        shortLabel: "Outils pro",
        iconName: "Tool",
        description: "",
        subCategories: [
          {
            id: "tools",
            slug: "outillage",
            name: "Outillage",
            parentSlug: "materiel-professionnel",
            attributesSchema: [],
          },
        ],
      },
    ];
    const html = render();
    expect(html).toContain('data-testid="categories-grid"');
    expect(html).toContain("grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5");
    expect(html).toContain("rounded-listing-card");
    expect(html).toContain('aria-label="Explorer Outils pro"');
    expect(html).toContain('href="/categorie/materiel-professionnel"');
    expect(html).toContain("1 rubrique");
    expect(html).toContain("Outils pro</h2>");
    expect(html).not.toContain("subCategory=");
  });

  it("reserves compact card geometry while the taxonomy loads", () => {
    state.isLoading = true;
    const html = render();
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/rounded-listing-card/g)).toHaveLength(5);
    expect(html).toContain("aspect-4/3");
    expect(html).not.toContain('data-testid="categories-grid"');
  });

  it("retains a retry action without inventing cards after an API failure", () => {
    state.error = new Error("test outage");
    const html = render();
    expect(html).toContain("Réessayer");
    expect(html).not.toContain('href="/categorie/');
  });

  it("keeps an empty catalogue empty", () => {
    expect(render()).not.toContain('data-testid="categories-grid"');
    expect(render()).toContain("Afficher toutes les catégories");
  });
});
