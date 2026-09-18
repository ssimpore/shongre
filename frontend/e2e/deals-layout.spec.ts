import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  test(`wraps and paginates reduced-price cards at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await usePersona(page, "guest");
    await page.goto("/offres-prix-reduit", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const dealsRegion = page.getByRole("region", {
      name: "Annonces en promotion",
    });
    // A page is eight organic cards; unified discovery may add its controlled
    // sponsored insertion on top, which is labelled as such and never
    // displaces an organic result.
    const organicCards = dealsRegion.locator("article").filter({
      hasNot: page.locator('[data-listing-badge="sponsored"]'),
    });
    await expect(organicCards).toHaveCount(8);
    expect(
      await dealsRegion
        .locator("article")
        .filter({ has: page.locator('[data-listing-badge="sponsored"]') })
        .count(),
    ).toBeLessThanOrEqual(1);

    const metrics = await page.evaluate(() => {
      const region = document.querySelector(
        'main [role="region"][aria-label="Annonces en promotion"]',
      );
      const grid = region?.firstElementChild;
      const cards = [...document.querySelectorAll("main article")];
      const cardWidths = cards.map((card) =>
        Math.round(card.getBoundingClientRect().width),
      );
      const cardRows = [
        ...new Set(
          cards.map((card) => Math.round(card.getBoundingClientRect().y)),
        ),
      ];
      return {
        cardCount: cards.length,
        cardWidths,
        cardRows,
        gridDisplay: grid ? getComputedStyle(grid).display : null,
        regionOverflows: region
          ? region.scrollWidth > region.clientWidth
          : false,
        pageOverflows:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      };
    });

    expect(metrics.cardCount).toBeGreaterThanOrEqual(8);
    expect(metrics.cardCount).toBeLessThanOrEqual(9);
    expect(
      new Set(metrics.cardWidths).size,
      `card widths differ: ${metrics.cardWidths.join(", ")}`,
    ).toBe(1);
    expect(metrics.cardRows.length).toBeGreaterThan(1);
    expect(metrics.gridDisplay).toBe("grid");
    expect(metrics.regionOverflows).toBe(false);
    expect(metrics.pageOverflows).toBe(false);

    const pagination = page.getByRole("navigation", {
      name: "Pagination des annonces en promotion",
    });
    await expect(pagination).toContainText("Page 1 sur 2");
    await pagination.getByRole("button", { name: "Suivant" }).click();

    await expect(page).toHaveURL(/\?page=2$/);
    await expect(pagination).toContainText("Page 2 sur 2");
    await expect(page.locator("main article").first()).toBeInViewport();
    // The last page holds the remainder: fewer than a full page, never empty.
    await expect
      .poll(() =>
        page
          .locator("main article")
          .filter({ hasNot: page.locator('[data-listing-badge="sponsored"]') })
          .count(),
      )
      .toBeLessThan(8);
    await expect(
      pagination.getByRole("button", { name: "Suivant" }),
    ).toBeDisabled();
    await expect(
      pagination.getByRole("button", { name: "Précédent" }),
    ).toBeEnabled();
  });
}

test("redirects the legacy reduced-price URL", async ({ page }) => {
  await usePersona(page, "guest");
  await page.goto("/bons-plans", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/offres-prix-reduit$/);
});
