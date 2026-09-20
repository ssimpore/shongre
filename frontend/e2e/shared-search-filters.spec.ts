import { expect, test } from "@playwright/test";
import { waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";

const searchSurfaces = [
  {
    name: "marketplace",
    path: "/recherche?category=materiel-professionnel",
    panelId: "search-filter-panel",
    adaptiveField: "Catégories",
    sectionId: "search-category",
    locationId: "search-filter-location",
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
    panelId: "auto-filter-panel",
    adaptiveField: "Type de véhicule",
    sectionId: "auto-type",
    locationId: "auto-location-selector",
    removedControlIds: [
      "auto-search-page-query-input",
      "auto-search-page-submit-button",
    ],
  },
  {
    name: "immo",
    path: "/immo",
    panelId: "immo-filter-panel",
    adaptiveField: "Projet",
    sectionId: "immo-project",
    locationId: "immo-location-selector",
    removedControlIds: [
      "immo-search-page-query-input",
      "immo-search-page-submit-button",
    ],
  },
  {
    name: "emploi",
    path: "/emploi",
    panelId: "employment-filter-panel",
    adaptiveField: "Métier",
    sectionId: "employment-profession",
    locationId: "employment-location-selector",
    removedControlIds: [
      "employment-search-page-query-input",
      "employment-search-page-submit-button",
    ],
  },
  {
    name: "education",
    path: "/education",
    panelId: "education-filter-panel",
    adaptiveField: "Matière",
    sectionId: "education-subject",
    locationId: "education-location-selector",
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
      await expect(toolbar.getByRole("status")).toBeVisible();
      if (surface.name === "marketplace") {
        await expect(page.locator("[data-search-active-filters]")).toHaveClass(
          /rounded-listing-card/,
        );
      }

      const panel = page.locator(`#${surface.panelId}`);
      await expect(panel).toBeHidden();
      await page
        .locator("[data-search-filter-rail]")
        .getByRole("button", { name: surface.adaptiveField, exact: true })
        .click();
      await expect(panel).toBeVisible();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(panel).toHaveAttribute("data-filter-panel", "drawer");
      await expect(
        panel.locator(`[data-filter-section="${surface.sectionId}"]`),
      ).toBeVisible();
      await expect(page.locator(`#${surface.locationId}`)).toBeVisible();
      await expect
        .poll(() =>
          page.getByRole("dialog").evaluate((dialog) => {
            const rect = dialog.getBoundingClientRect();
            return Math.round(rect.right - window.innerWidth);
          }),
        )
        .toBe(0);
      await page.getByRole("button", { name: "Fermer" }).click();
      await expect(panel).toBeHidden();

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
      const characteristics = listCard.locator(
        '[data-listing-card-characteristics="true"]',
      );
      // Every surface projects card characteristics now, the generic
      // marketplace included: its cards read the published taxonomy's
      // `cardCharacteristics`, the same way the vertical projections do.
      await expect(characteristics).toBeVisible();
      await expect(
        listCard.locator('[data-listing-card-seller-identity="true"]'),
      ).toBeVisible();
    });
  }
});
