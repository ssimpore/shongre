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
