import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("Admin-managed homepage discovery", () => {
  test("renders configured discovery tabs before collections", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const discovery = page.getByTestId("home-discovery");
    const collections = page.getByTestId("home-collection-explorer");
    await expect(discovery).toBeVisible();
    await expect(discovery.getByRole("tab")).toHaveText([
      "Annonces récentes",
      "Tendances du moment",
      "Meilleures offres",
    ]);

    const panel = discovery.getByRole("tabpanel");
    const orderedTabs = discovery.getByRole("tab");
    await expect(orderedTabs.nth(1)).toHaveAttribute("aria-selected", "true");
    const trendingCount = await panel.locator("article").count();
    expect(trendingCount).toBeGreaterThan(0);
    expect(trendingCount).toBeLessThanOrEqual(8);

    await orderedTabs.nth(1).focus();
    await orderedTabs.nth(1).press("ArrowLeft");
    await expect(orderedTabs.nth(0)).toBeFocused();
    await expect(orderedTabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await orderedTabs.nth(0).press("ArrowRight");
    await expect(orderedTabs.nth(1)).toBeFocused();
    await expect(orderedTabs.nth(1)).toHaveAttribute("aria-selected", "true");

    await discovery.getByRole("tab", { name: "Meilleures offres" }).click();
    await expect(panel.locator("article")).toHaveCount(6);
    await discovery.getByRole("tab", { name: "Annonces récentes" }).click();
    await expect(panel.locator("article")).toHaveCount(12);

    await expect(collections).toBeVisible();
    await expect(
      collections.getByRole("link", { name: /^Explorer la collection / }),
    ).toHaveCount(5);
    await expect(
      discovery.getByRole("link", { name: "Voir tout" }),
    ).toBeVisible();
    await expect(
      collections.getByRole("link", {
        name: "Voir toutes les collections",
      }),
    ).toBeVisible();

    const collectionsFollowDiscovery = await discovery.evaluate(
      (discoverySection, collectionsSection) =>
        Boolean(
          collectionsSection &&
          discoverySection.compareDocumentPosition(collectionsSection) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await collections.elementHandle(),
    );

    expect(collectionsFollowDiscovery).toBe(true);
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
