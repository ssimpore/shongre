import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("Homepage discovery simplification", () => {
  test("keeps recent listings primary, then a short deals rail and collection cards", async ({
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
    const collections = page.getByTestId("home-collection-explorer");

    await expect(recentListings).toBeVisible();
    await expect(recentListings.locator("article")).toHaveCount(12);
    await expect(deals).toBeVisible();
    await expect(deals.locator("article")).toHaveCount(6);
    await expect(collections).toBeVisible();
    await expect(
      collections.getByRole("link", { name: /^Explorer la collection / }),
    ).toHaveCount(5);

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
    const collectionsFollowDeals = await deals.evaluate(
      (dealsSection, collectionsSection) =>
        Boolean(
          collectionsSection &&
          dealsSection.compareDocumentPosition(collectionsSection) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await collections.elementHandle(),
    );

    expect(dealsFollowRecentListings).toBe(true);
    expect(collectionsFollowDeals).toBe(true);
  });

  test("opens a collection from the homepage discovery rail", async ({ page }) => {
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
