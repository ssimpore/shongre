import React from "react";
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
          onSelectCategory={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Immobilier");
    expect(markup).toContain("Matériel Pro");
    expect(markup).toContain("Maison &amp; Jardin");
    expect(markup).toContain("Bons plans !");
    expect(markup).not.toContain("Toutes les annonces");
    expect(markup).not.toContain("rounded-full");
    expect(markup).toContain('href="/recherche?category=loisirs-culture"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("hover:bg-bg-subtle");
    expect(markup).toContain("focus-visible:ring-2");
    expect(markup).toContain("rounded-control");
  });
});
