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
