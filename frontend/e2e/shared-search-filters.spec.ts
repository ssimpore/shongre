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
      const toolbar = page.locator("[data-search-results-toolbar]");
      await expect(toolbar).toBeVisible();
      await expect(toolbar).toHaveClass(/rounded-listing-card/);
      if (surface.name === "marketplace") {
        await expect(page.locator("[data-search-active-filters]")).toHaveClass(
          /rounded-listing-card/,
        );
      }

      const panel = page.locator(`#${surface.panelId}`);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveClass(/rounded-listing-card/);
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
      const mapResultsLayout = page
        .locator('[data-search-map-results-layout="true"]')
        .first();
      const mapResultsList = mapResultsLayout.locator(
        '[data-search-map-results-list="true"]',
      );
      const mapPanel = mapResultsLayout.locator(
        '[data-search-map-panel="true"]',
      );
      const mapResultCard = mapResultsList
        .locator('[data-search-map-result-card="true"]')
        .first();
      await expect(mapResultsLayout).toBeVisible();
      await expect(mapResultsList).toBeVisible();
      await expect(mapResultCard).toBeVisible();
      await expect(
        mapResultCard.locator('article[data-listing-card-variant="list"]'),
      ).toBeVisible();
      await expect(mapPanel.locator("[data-search-results-map]")).toBeVisible();
      const mapGeometry = await mapResultsLayout.evaluate((layout) => {
        const results = layout.querySelector<HTMLElement>(
          '[data-search-map-results-list="true"]',
        );
        const map = layout.querySelector<HTMLElement>(
          '[data-search-map-panel="true"]',
        );
        const resultsRect = results?.getBoundingClientRect();
        const mapRect = map?.getBoundingClientRect();
        return {
          resultsRight: resultsRect?.right ?? 0,
          mapLeft: mapRect?.left ?? 0,
          resultsHeight: resultsRect?.height ?? 0,
          mapHeight: mapRect?.height ?? 0,
        };
      });
      expect(mapGeometry.resultsRight).toBeLessThanOrEqual(
        mapGeometry.mapLeft + 1,
      );
      expect(mapGeometry.resultsHeight).toBeCloseTo(mapGeometry.mapHeight, 0);

      await page.getByRole("button", { name: "Affichage liste" }).click();
      await expect(
        page.getByRole("button", { name: "Affichage liste" }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("view"))
        .toBe("list");

      const listGrid = page
        .locator('[data-listing-grid-variant="list"]')
        .first();
      const listCard = listGrid
        .locator('article[data-listing-card-variant="list"]')
        .first();
      await expect(listGrid).toBeVisible();
      await expect(listCard).toBeVisible();
      const geometry = await listCard.evaluate((card) => {
        const grid = card.closest<HTMLElement>(
          '[data-listing-grid-variant="list"]',
        );
        const link = card.querySelector<HTMLElement>(".listing-card-list-link");
        const image = card.querySelector<HTMLElement>(
          ".listing-card-list-image",
        );
        const content = card.querySelector<HTMLElement>(
          ".listing-card-list-content",
        );
        return {
          gridWidth: grid?.getBoundingClientRect().width ?? 0,
          cardWidth: card.getBoundingClientRect().width,
          direction: link ? getComputedStyle(link).flexDirection : "",
          imageRight: image?.getBoundingClientRect().right ?? 0,
          contentLeft: content?.getBoundingClientRect().left ?? 0,
        };
      });
      expect(geometry.direction).toBe("row");
      expect(geometry.cardWidth).toBeCloseTo(geometry.gridWidth, 0);
      expect(geometry.imageRight).toBeLessThanOrEqual(geometry.contentLeft + 1);
      await expect(
        listCard.locator('[data-listing-card-characteristics="true"]'),
      ).toBeVisible();
      await expect(
        listCard.locator('[data-listing-card-seller-identity="true"]'),
      ).toBeVisible();
    });
  }
});
