import { test, expect } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("Admin-managed homepage discovery", () => {
  test("renders each configured discovery feed as its own section", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const recent = page.getByTestId("home-discovery-recent_listings");
    const trending = page.getByTestId("home-discovery-trending");
    const deals = page.getByTestId("home-discovery-deals");
    const discoverySections = page.locator("[data-home-discovery-type]");
    const collections = page.getByTestId("home-collection-explorer");

    await expect(discoverySections).toHaveCount(3);
    expect(
      await discoverySections.evaluateAll((elements) =>
        elements.map((element) =>
          element.getAttribute("data-home-discovery-type"),
        ),
      ),
    ).toEqual(["recent_listings", "trending", "deals"]);
    await expect(page.getByRole("tab")).toHaveCount(0);

    await expect(recent).toBeVisible();
    await expect(
      recent.getByRole("heading", { name: "Annonces récentes" }),
    ).toBeVisible();
    await expect(recent.locator("article")).toHaveCount(12);

    await trending.scrollIntoViewIfNeeded();
    await expect(trending).toBeVisible();
    await expect(
      trending.getByRole("heading", { name: "En tendence" }),
    ).toBeVisible();
    const trendingCount = await trending.locator("article").count();
    expect(trendingCount).toBeGreaterThan(0);
    expect(trendingCount).toBeLessThanOrEqual(8);

    await deals.scrollIntoViewIfNeeded();
    await expect(deals).toBeVisible();
    await expect(
      deals.getByRole("heading", { name: "Meilleures offres" }),
    ).toBeVisible();
    await expect(deals.locator("article")).toHaveCount(6);

    for (const section of [recent, trending, deals]) {
      await expect(
        section.getByRole("link", { name: "Voir tout" }),
      ).toBeVisible();
    }

    await expect(collections).toBeVisible();
    await expect(
      collections.getByRole("link", { name: /^Explorer la collection / }),
    ).toHaveCount(5);
    await expect(
      collections.getByRole("link", {
        name: "Voir toutes les collections",
      }),
    ).toBeVisible();

    const collectionsFollowDiscovery = await deals.evaluate(
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

  test("keeps every homepage discovery listing on one shared card footprint", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");

    for (const viewport of [
      { width: 1408, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const sections = page.locator("[data-home-discovery-type]");
      await expect(sections).toHaveCount(3);

      const cardGeometry: Array<{
        height: number;
        contained: boolean;
      }> = [];

      for (let sectionIndex = 0; sectionIndex < 3; sectionIndex += 1) {
        const section = sections.nth(sectionIndex);
        await section.scrollIntoViewIfNeeded();
        const cards = section.locator('[data-listing-card="true"]');
        await expect(cards.first()).toBeVisible();
        expect(
          await cards.evaluateAll((elements) =>
            elements.every(
              (element) =>
                element.getAttribute("data-listing-card-variant") ===
                "showcase",
            ),
          ),
        ).toBe(true);
        cardGeometry.push(
          ...(await cards.evaluateAll((elements) =>
            elements.map((element) => {
              const link = element.querySelector<HTMLElement>(":scope > a");
              return {
                height: element.getBoundingClientRect().height,
                contained: Boolean(
                  link &&
                  element.scrollHeight <= element.clientHeight + 1 &&
                  link.scrollHeight <= link.clientHeight + 1,
                ),
              };
            }),
          )),
        );
      }

      expect(cardGeometry.length).toBeGreaterThan(3);
      expect(cardGeometry.every(({ contained }) => contained)).toBe(true);
      expect(
        Math.max(...cardGeometry.map(({ height }) => height)) -
          Math.min(...cardGeometry.map(({ height }) => height)),
      ).toBeLessThanOrEqual(1);
      await expectNoHorizontalOverflow(
        page,
        `homepage discovery cards at ${viewport.width}px`,
      );
    }
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
