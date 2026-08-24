import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("Homepage discovery simplification", () => {
  test("keeps recent listings primary, then a short deals rail and category tiles", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const recentListings = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", {
          name: "Annonces récentes",
          exact: true,
        }),
      })
      .first();
    const deals = page.getByTestId("home-deals");
    const categories = page.getByTestId("home-category-explorer");

    await expect(recentListings).toBeVisible();
    await expect(recentListings.locator("article")).toHaveCount(12);
    await expect(deals).toBeVisible();
    await expect(deals.locator("article")).toHaveCount(6);
    await expect(categories).toBeVisible();
    await expect(
      categories.getByRole("link", { name: /^Explorer / }),
    ).toHaveCount(8);

    await expect(
      page.getByRole("heading", {
        name: "En ce moment sur Shongre",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Tendance en ce moment",
        exact: true,
      }),
    ).toHaveCount(0);

    const dealsFollowRecentListings = await recentListings.evaluate(
      (recentSection, dealsSection) =>
        Boolean(
          dealsSection &&
          recentSection.compareDocumentPosition(dealsSection) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await deals.elementHandle(),
    );
    const categoriesFollowDeals = await deals.evaluate(
      (dealsSection, categoriesSection) =>
        Boolean(
          categoriesSection &&
          dealsSection.compareDocumentPosition(categoriesSection) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await categories.elementHandle(),
    );

    expect(dealsFollowRecentListings).toBe(true);
    expect(categoriesFollowDeals).toBe(true);
  });

  test("opens a category from the compact discovery grid", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const firstCategory = page
      .getByTestId("home-category-explorer")
      .getByRole("link", { name: /^Explorer / })
      .first();
    await expect(firstCategory).toBeVisible();
    await firstCategory.click();

    await expect(page).toHaveURL(/\/categorie\//);
  });

  test("uses a two-column category grid on mobile without page overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const tiles = page
      .getByTestId("home-category-explorer")
      .getByRole("link", { name: /^Explorer / });
    await expect(tiles).toHaveCount(8);

    const positions = await tiles.evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: Math.round(rect.top), left: Math.round(rect.left) };
      }),
    );

    expect(positions[0].top).toBe(positions[1].top);
    expect(positions[0].left).toBeLessThan(positions[1].left);
    expect(positions[2].top).toBeGreaterThan(positions[0].top);
    await expectNoHorizontalOverflow(page, "homepage category grid");
  });

  test("keeps one Pro action and routes it to the Pro information page", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const proSection = page.locator(
      'section[aria-labelledby="home-pro-title"]',
    );
    await expect(proSection).toBeVisible();
    await expect(proSection.getByRole("link")).toHaveCount(1);

    await proSection
      .getByRole("link", { name: "Découvrir les forfaits Pro" })
      .click();
    await expect(page).toHaveURL("/solutions-pro");
  });

  test("removes duplicate and inactive footer promotions", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("complementary", { name: "Newsletter Shongre" }),
    ).toBeVisible();
    await expect(
      footer.getByRole("button", { name: "Gestion des cookies" }),
    ).toBeVisible();

    await expect(
      footer.getByRole("region", { name: "Garanties Shongre" }),
    ).toHaveCount(0);
    await expect(
      footer.getByRole("region", { name: "Applications mobiles Shongre" }),
    ).toHaveCount(0);
    await expect(footer.getByText("Suivez-nous", { exact: true })).toHaveCount(
      0,
    );
    await expect(footer.getByText(/bientôt disponible/)).toHaveCount(0);
  });
});
