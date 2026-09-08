import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { HeaderCategoryNav } from "./HeaderCategoryNav";

const marketContext = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure: {
    franceDomain: "shongre.fr",
    globalDomain: "shongre.com",
    canonicalProtocol: "https",
  },
});

const configuredCategories = [
  {
    categoryId: "leisure_culture",
    slug: "loisirs-culture",
    labels: { "fr-FR": "Loisirs & Culture" },
    shortLabels: { "fr-FR": "Loisirs" },
    iconName: "palette",
    isActive: true,
    displayOrder: 0,
  },
  {
    categoryId: "electronics",
    slug: "electronique",
    labels: { "fr-FR": "Électronique" },
    shortLabels: { "fr-FR": "Électronique" },
    iconName: "smartphone",
    isActive: true,
    displayOrder: 1,
  },
  {
    categoryId: "education",
    slug: "education",
    labels: { "fr-FR": "Éducation & Formation" },
    shortLabels: { "fr-FR": "Éducation" },
    iconName: "graduation-cap",
    isActive: true,
    displayOrder: 2,
  },
];

describe("HeaderCategoryNav", () => {
  it("renders only the configured categories in their data-defined order", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HeaderCategoryNav
          activeCategorySlug="loisirs-culture"
          currentPath="/recherche"
          initialCategories={configuredCategories}
          marketContext={marketContext}
          marketCode="FR"
          onSelectCategory={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(markup).not.toContain("Immobilier");
    expect(markup).not.toContain("Outils pro");
    expect(markup.indexOf("Loisirs")).toBeLessThan(
      markup.indexOf("Électronique"),
    );
    expect(markup.indexOf("Électronique")).toBeLessThan(
      markup.indexOf("Éducation"),
    );
    expect(markup).not.toContain("Promotions");
    expect(markup).not.toContain('href="/offres-prix-reduit"');
    expect(markup).not.toContain("Toutes les annonces");
    expect(markup).not.toContain("rounded-full");
    expect(markup).toContain('href="/recherche?category=loisirs-culture"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("hover:bg-bg-subtle");
    expect(markup).toContain("focus-visible:ring-2");
    expect(markup).toContain("rounded-control");
    expect(markup).toContain('id="header-category-trigger-electronique"');
    expect(markup).not.toContain(
      'id="header-category-trigger-category_overview"',
    );
    expect(markup).toContain('id="header-category-trigger-education"');
    expect(markup).toContain('href="/education"');
    expect(markup).not.toContain(
      "header-category-trigger-multimedia-electronique",
    );
  });

  it("uses backend link labels and one order without category-specific emphasis", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HeaderCategoryNav
          currentPath="/offres-prix-reduit"
          initialCategories={configuredCategories.map((category) => ({
            ...category,
            displayOrder: category.displayOrder + 1,
          }))}
          initialLinks={[
            {
              target: "promotions",
              labels: { "fr-FR": "Offres du marché" },
              shortLabels: { "fr-FR": "Offres du marché" },
              isActive: true,
              displayOrder: 0,
            },
            {
              target: "category_overview",
              labels: { "fr-FR": "Explorer" },
              shortLabels: { "fr-FR": "Explorer" },
              isActive: true,
              displayOrder: 9,
            },
          ]}
          marketContext={marketContext}
          marketCode="FR"
          onSelectCategory={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(markup).toContain("Offres du marché");
    expect(markup).not.toContain("Promotions");
    expect(markup).not.toContain("Autres");
    expect(markup.indexOf("Offres du marché")).toBeLessThan(
      markup.indexOf("Électronique"),
    );
    expect(markup.indexOf("Explorer")).toBeGreaterThan(
      markup.indexOf("Éducation"),
    );
    expect(markup).toContain('id="header-category-trigger-category_overview"');
    expect(markup).toContain('href="/offres-prix-reduit"');
    expect(markup).toContain('aria-current="page"');
  });

  it("never invents utility links for an empty, missing, or disabled configuration", () => {
    const render = (
      links?: import("@shongre/contracts/taxonomy").TaxonomyHeaderNavigationLink[],
    ) =>
      renderToStaticMarkup(
        <MemoryRouter>
          <HeaderCategoryNav
            currentPath="/"
            initialLinks={links}
            marketContext={marketContext}
            marketCode="FR"
            onSelectCategory={vi.fn()}
          />
        </MemoryRouter>,
      );
    for (const markup of [
      render(),
      render([]),
      render([
        {
          target: "promotions",
          labels: { "fr-FR": "Promotions" },
          shortLabels: { "fr-FR": "Promotions" },
          isActive: false,
          displayOrder: 0,
        },
      ]),
    ]) {
      expect(markup).not.toContain('data-header-nav-item="true"');
      expect(markup).not.toContain("Promotions");
      expect(markup).not.toContain("Autres");
    }
  });
});
