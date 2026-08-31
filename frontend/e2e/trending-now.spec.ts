import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("Admin-managed homepage discovery", () => {
  test("renders trends, six deals, recent listings, then collections in configured order", async ({
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
    const trending = page.getByTestId("home-trending");
    const collections = page.getByTestId("home-collection-explorer");

    await expect(recentListings).toBeVisible();
    await expect(recentListings.locator("article")).toHaveCount(12);
    await expect(trending).toBeVisible();
    await expect(trending.locator(":scope > section")).toHaveCount(4);
    for (const topic of await trending.locator(":scope > section").all()) {
      const count = await topic.locator("article").count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(8);
    }
    await expect(deals).toBeVisible();
    await expect(deals.locator("article")).toHaveCount(6);
    await expect(collections).toBeVisible();
    await expect(
      collections.getByRole("link", { name: /^Explorer la collection / }),
    ).toHaveCount(5);
    await expect(
      trending.getByRole("link", { name: "Voir toutes les annonces" }),
    ).toHaveCount(4);
    await expect(
      deals.getByRole("link", { name: "Voir toutes les offres" }),
    ).toBeVisible();
    await expect(
      recentListings.getByRole("link", {
        name: "Voir toutes les nouveautés",
      }),
    ).toBeVisible();
    await expect(
      collections.getByRole("link", {
        name: "Voir toutes les collections",
      }),
    ).toBeVisible();
    await expect(page.locator('[data-home-section-action="true"]')).toHaveCount(
      7,
    );

    await expect(
      page.getByRole("heading", {
        name: "En ce moment sur Shongre",
        exact: true,
      }),
    ).toBeVisible();

    const dealsFollowTrending = await trending.evaluate(
      (trendingSection, dealsSection) =>
        Boolean(
          dealsSection &&
          trendingSection.compareDocumentPosition(dealsSection) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await deals.elementHandle(),
    );
    const recentFollowsDeals = await deals.evaluate(
      (dealsSection, recentSection) =>
        Boolean(
          recentSection &&
          dealsSection.compareDocumentPosition(recentSection) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await recentListings.elementHandle(),
    );
    const collectionsFollowRecent = await recentListings.evaluate(
      (recentSection, collectionsSection) =>
        Boolean(
          collectionsSection &&
          recentSection.compareDocumentPosition(collectionsSection) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await collections.elementHandle(),
    );

    expect(dealsFollowTrending).toBe(true);
    expect(recentFollowsDeals).toBe(true);
    expect(collectionsFollowRecent).toBe(true);
  });

  test("opens a collection from the homepage discovery rail", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const firstCollection = page
      .getByTestId("home-collection-explorer")
      .getByRole("link", { name: /^Explorer la collection / })
      .first();
    await expect(firstCollection).toBeVisible();
    await firstCollection.click();

    await expect(page).toHaveURL(/\/collections\//);
  });

  test("uses a horizontal collection rail on mobile without page overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const cards = page
      .getByTestId("home-collection-explorer")
      .getByRole("link", { name: /^Explorer la collection / });
    await expect(cards).toHaveCount(5);

    const positions = await cards.evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: Math.round(rect.top), left: Math.round(rect.left) };
      }),
    );

    expect(positions[0].top).toBe(positions[1].top);
    expect(positions[0].left).toBeLessThan(positions[1].left);
    expect(positions[1].top).toBe(positions[2].top);
    await expectNoHorizontalOverflow(page, "homepage collection rail");
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

  test("keeps footer essentials and truthful upcoming promotions", async ({
    page,
  }) => {
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
    ).toBeVisible();
    await expect(
      footer.getByRole("region", { name: "Suivez Shongre" }),
    ).toBeVisible();
    await expect(footer.getByText("Bientôt sur")).toHaveCount(2);
    await expect(
      footer.getByRole("img", { name: /bientôt disponible/ }),
    ).toHaveCount(4);
  });
});
