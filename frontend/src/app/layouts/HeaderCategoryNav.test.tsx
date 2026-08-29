import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HeaderCategoryNav } from "./HeaderCategoryNav";

describe("HeaderCategoryNav", () => {
  it("renders the edited text navigation without the former all-listings chip", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HeaderCategoryNav
          activeCategorySlug="loisirs-culture"
          currentPath="/recherche"
          marketCode="FR"
          onSelectCategory={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Immobilier");
    expect(markup).toContain("Outils pro");
    expect(markup).toContain("Maison");
    expect(markup).toContain("Promotions");
    expect(markup).toContain('href="/offres-prix-reduit"');
    expect(markup).not.toContain("Toutes les annonces");
    expect(markup).not.toContain("rounded-full");
    expect(markup).toContain('href="/recherche?category=loisirs-culture"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("hover:bg-bg-subtle");
    expect(markup).toContain("focus-visible:ring-2");
    expect(markup).toContain("rounded-control");
    expect(markup).toContain('id="header-category-trigger-electronique"');
    expect(markup).toContain('id="header-category-trigger-autres"');
    expect(markup).toContain('id="header-category-trigger-education"');
    expect(markup).toContain('href="/education"');
    expect(markup).not.toContain(
      "header-category-trigger-multimedia-electronique",
    );
  });
});
