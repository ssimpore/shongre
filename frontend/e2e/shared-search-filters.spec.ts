import { expect, test } from "@playwright/test";
import { waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";

const searchSurfaces = [
  {
    name: "marketplace",
    path: "/recherche?category=materiel-professionnel",
    panelId: "search-filter-panel-desktop",
    adaptiveField: "Catégories",
    locationId: "search-filter-location-desktop",
    removedControlIds: [
      "search-results-page-category-button",
      "search-results-page-query-input",
      "search-results-page-location-button",
      "search-results-page-submit-button",
    ],
  },
  {
    name: "auto",
    path: "/auto",
    panelId: "auto-filter-panel-desktop",
    adaptiveField: "Type de véhicule",
    locationId: "auto-location-selector-desktop",
    removedControlIds: [
      "auto-search-page-query-input",
      "auto-search-page-submit-button",
    ],
  },
  {
    name: "immo",
    path: "/immo",
    panelId: "immo-filter-panel-desktop",
    adaptiveField: "Projet",
    locationId: "immo-location-selector-desktop",
    removedControlIds: [
      "immo-search-page-query-input",
      "immo-search-page-submit-button",
    ],
  },
  {
    name: "emploi",
    path: "/emploi",
    panelId: "employment-filter-panel-desktop",
    adaptiveField: "Métier",
    locationId: "employment-location-selector-desktop",
    removedControlIds: [
      "employment-search-page-query-input",
      "employment-search-page-submit-button",
    ],
  },
  {
    name: "education",
    path: "/education",
    panelId: "education-filter-panel-desktop",
    adaptiveField: "Matière",
    locationId: "education-location-selector-desktop",
    removedControlIds: [
      "education-search-page-query-input",
      "education-search-page-submit-button",
    ],
  },
] as const;

test.describe("shared search filter panels", () => {
  for (const surface of searchSurfaces) {
    test(`${surface.name} uses the shared responsive filter disclosure`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1408, height: 900 });
      await usePersona(page, "guest");
      await page.goto(surface.path);
      await waitForStableLayout(page);

      await expect(page.locator("[data-search-control-panel]")).toHaveCount(0);
      await expect(page.locator("[data-search-fixed-context]")).toHaveCount(0);
      for (const id of surface.removedControlIds) {
        await expect(page.locator(`#${id}`)).toHaveCount(0);
      }
      await expect(page.locator("[data-search-results-toolbar]")).toBeVisible();

      const panel = page.locator(`#${surface.panelId}`);
      await expect(panel).toBeVisible();
      await expect(panel).toContainText(surface.adaptiveField);
      await expect(page.locator(`#${surface.locationId}`)).toBeVisible();

      await page.getByRole("button", { name: "Masquer les filtres" }).click();
      await expect(panel).toBeHidden();
      await page.getByRole("button", { name: "Afficher les filtres" }).click();
      await expect(page.locator(`#${surface.panelId}`)).toBeVisible();

      await page.getByRole("button", { name: "Affichage carte" }).click();
      await expect(
        page.getByRole("button", { name: "Affichage carte" }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("view"))
        .toBe("map");
      await expect(page.locator("[data-search-results-map]")).toBeVisible();

      await page.getByRole("button", { name: "Affichage liste" }).click();
      await expect(
        page.getByRole("button", { name: "Affichage liste" }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("view"))
        .toBe("list");
    });
  }
});
