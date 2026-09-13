import { expect, test } from "@playwright/test";
import { waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";

const mapSearchSurfaces = [
  {
    name: "marketplace",
    path: "/recherche?category=materiel-professionnel",
  },
  { name: "auto", path: "/auto" },
  { name: "immo", path: "/immo" },
  { name: "emploi", path: "/emploi" },
  { name: "education", path: "/education" },
] as const;

test.describe("listing map surface radius", () => {
  for (const surface of mapSearchSurfaces) {
    test(`${surface.name} matches the listing-card radius token`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1408, height: 900 });
      await usePersona(page, "guest");
      await page.goto(surface.path);
      await waitForStableLayout(page);

      const mapMode = page.getByRole("button", { name: "Affichage carte" });
      if ((await mapMode.getAttribute("aria-pressed")) !== "true") {
        await mapMode.click();
      }
      await expect(mapMode).toHaveAttribute("aria-pressed", "true");

      const layout = page
        .locator('[data-search-map-results-layout="true"]')
        .first();
      const mapSurface = layout.locator("[data-search-results-map]").first();
      const listingCard = layout
        .locator('article[data-listing-card="true"]')
        .first();
      await expect(mapSurface).toBeVisible();
      await expect(listingCard).toBeVisible();
      await expect(mapSurface).toHaveClass(/rounded-listing-card/);

      const radii = await Promise.all([
        mapSurface.evaluate(
          (element) => getComputedStyle(element).borderRadius,
        ),
        listingCard.evaluate(
          (element) => getComputedStyle(element).borderRadius,
        ),
        page.evaluate(() => {
          const probe = document.createElement("div");
          probe.style.borderRadius = "var(--radius-listing-card)";
          document.body.append(probe);
          const radius = getComputedStyle(probe).borderRadius;
          probe.remove();
          return radius;
        }),
      ]);

      expect(radii[0]).toBe(radii[2]);
      expect(radii[1]).toBe(radii[2]);
    });
  }
});
