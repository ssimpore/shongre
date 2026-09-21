import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

test.describe("search empty-state actions", () => {
  for (const viewport of [
    { name: "small phone", width: 320, height: 720 },
    { name: "phone", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(`does not repeat the toolbar save action at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await usePersona(page, "guest");
      await page.goto(
        "/recherche?query=aucune-annonce-ne-correspond&maxPrice=1&category=vehicules",
        {
          waitUntil: "domcontentloaded",
        },
      );
      await waitForStableLayout(page);

      const emptyState = page.locator("#search-no-results");
      await expect(
        emptyState.getByRole("button", {
          name: "Effacer tous les filtres",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        emptyState.getByRole("button", {
          name: "Sauvegarder cette recherche",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.locator("#search-results-toolbar").getByRole("button", {
          name: "Sauvegarder cette recherche",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Sauvegarder cette recherche",
          exact: true,
        }),
      ).toHaveCount(1);
      expect(
        await emptyState.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
    });
  }
});
