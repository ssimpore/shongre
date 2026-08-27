import { expect, test } from "@playwright/test";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const FILTER_SURFACES = [
  {
    name: "marketplace search",
    path: "/recherche",
    desktopTrigger: "Afficher les filtres",
    mobileTrigger: /^Ouvrir les filtres de recherche/,
  },
  { name: "vehicles", path: "/auto", mobileTrigger: "Filtres" },
  { name: "real estate", path: "/immo", mobileTrigger: "Filtres" },
  { name: "employment", path: "/emploi", mobileTrigger: "Filtres" },
  { name: "education", path: "/education", mobileTrigger: "Filtres" },
] as const;

const DROPDOWN_SURFACES = [
  {
    name: "vehicles",
    path: "/auto",
    filterLabel: "Type de véhicule",
    sortLabel: "Trier les véhicules",
    nextSortLabel: "Prix croissant",
    expectedSort: "price_asc",
  },
  {
    name: "employment",
    path: "/emploi",
    filterLabel: "Métier",
    sortLabel: "Trier les offres",
    nextSortLabel: "Plus récentes",
    expectedSort: "newest",
  },
  {
    name: "education",
    path: "/education",
    filterLabel: "Matière",
    sortLabel: "Trier les professeurs",
    nextSortLabel: "Prix croissant",
    expectedSort: "price_asc",
  },
] as const;

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
});

test.describe("canonical marketplace filter panel", () => {
  for (const surface of FILTER_SURFACES) {
    test(`${surface.name} uses the shared desktop surface`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      if ("desktopTrigger" in surface) {
        await page
          .getByRole("button", { name: surface.desktopTrigger })
          .click();
      }

      const panel = page.locator('[data-filter-panel="surface"]');
      await expect(panel).toHaveCount(1);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveClass(/rounded-card/);
      await expect(panel).toHaveClass(/border-border-base/);
      await expect(panel).toHaveClass(/bg-bg-surface/);
      await expect(
        panel.getByRole("heading", { name: "Filtres", exact: true }),
      ).toBeVisible();
      await expect(
        panel.getByRole("button", { name: "Réinitialiser", exact: true }),
      ).toBeVisible();
    });

    test(`${surface.name} uses the shared mobile drawer presentation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      await page
        .getByRole("button", { name: surface.mobileTrigger })
        .first()
        .click();

      const panel = page.locator('[data-filter-panel="drawer"]');
      await expect(panel).toHaveCount(1);
      await expect(panel).toBeVisible();
      await expect(
        panel.getByRole("button", { name: "Réinitialiser", exact: true }),
      ).toBeVisible();
    });
  }
});

test.describe("canonical vertical dropdowns", () => {
  for (const surface of DROPDOWN_SURFACES) {
    test(`${surface.name} composes the shared listbox primitive`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const main = page.locator("main#main-content");
      await expect(main.locator("select")).toHaveCount(0);

      const filter = main.getByRole("button", {
        name: surface.filterLabel,
        exact: true,
      });
      const sort = main.getByRole("button", {
        name: surface.sortLabel,
        exact: true,
      });
      await expect(filter).toBeVisible();
      await expect(sort).toBeVisible();

      for (const trigger of [filter, sort]) {
        await expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
        await expect(trigger).toHaveClass(/rounded-control/);
        await expect(trigger).toHaveClass(/border-border-base/);
      }

      await sort.click();
      const listbox = main.getByRole("listbox", {
        name: surface.sortLabel,
      });
      await expect(listbox).toBeVisible();
      await expect(listbox).toHaveClass(/rounded-card/);
      await expect(listbox).toHaveClass(/shadow-dropdown/);
      await expect(listbox).toHaveClass(/border-border-base/);
      await expect(listbox.getByText("Trier par", { exact: true })).toBeVisible();

      await listbox
        .getByRole("option", { name: surface.nextSortLabel, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`(?:\\?|&)sort=${surface.expectedSort}(?:&|$)`),
      );
      await expect(listbox).toBeHidden();
      await expect(sort).toBeFocused();
    });
  }
});
