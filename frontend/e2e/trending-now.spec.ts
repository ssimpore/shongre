import { test, expect } from "@playwright/test";
import type { components } from "@shongre/contracts/openapi";
import { browserApi } from "./browser-api";
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
    // The order is the market's published composition — administered in
    // `/admin/tendances`, and edited by that journey while this one runs —
    // so it is read from the same experience the page was rendered from.
    const { status, body } = await browserApi(
      page,
      "/home?market=FR&country=FR&locale=fr-FR",
    );
    expect(status).toBe(200);
    const configuredOrder = (
      body as components["schemas"]["HomepageExperience"]
    ).sections
      .filter((section) =>
        ["recent_listings", "trending", "deals"].includes(section.type),
      )
      .map((section) => section.type);
    expect(configuredOrder).toHaveLength(3);
    expect(
      await discoverySections.evaluateAll((elements) =>
        elements.map((element) =>
          element.getAttribute("data-home-discovery-type"),
        ),
      ),
    ).toEqual(configuredOrder);
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
        const rowStart = cardGeometry.length;
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
        const rowHeights = cardGeometry
          .slice(rowStart)
          .map(({ height }) => height);
        expect(
          Math.max(...rowHeights) - Math.min(...rowHeights),
        ).toBeLessThanOrEqual(1);
      }

      expect(cardGeometry.length).toBeGreaterThan(3);
      expect(cardGeometry.every(({ contained }) => contained)).toBe(true);
      await expectNoHorizontalOverflow(
        page,
        `homepage discovery cards at ${viewport.width}px`,
      );
    }
  });

  test("places discovery navigation on the rail and advances it", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const section = page.getByTestId("home-discovery-recent_listings");
    await section.scrollIntoViewIfNeeded();
    const next = section.getByRole("button", { name: /défiler.*droite/i });
    const track = section.locator(".overflow-x-auto");
    const card = section.locator("article").first();
    const [buttonBox, cardBox] = await Promise.all([
      next.boundingBox(),
      card.boundingBox(),
    ]);
    // The shared rail overlays its control on the track, centred on the
    // cards, rather than parking it in a header row above them.
    expect(buttonBox!.y).toBeGreaterThanOrEqual(cardBox!.y);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(
      cardBox!.y + cardBox!.height,
    );
    await next.click();
    await expect
      .poll(() => track.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page, "discovery navigation");
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
    for (const name of ["Acheter", "Vendre", "Aide", "À propos"]) {
      await expect(
        footer.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
    }
    await expect(
      footer.getByRole("link", { name: "Newsletter Shongre" }),
    ).toHaveAttribute("href", "/newsletter");
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

for (const { width, hasTouch } of [
  { width: 1408, hasTouch: false },
  { width: 768, hasTouch: true },
]) {
  test.describe(`homepage rail arrows at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch });

    test("places compact controls on overflowing tracks and hides them at the ends", async ({
      page,
    }) => {
      await useEstablishedConsent(page);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      const hero = page.locator("[data-home-boosted-carousel]");
      const heroNext = hero.getByRole("button", { name: "Annonce suivante" });
      await expect(heroNext).toBeVisible();
      const controlSize = hasTouch ? 44 : 32;
      expect((await heroNext.boundingBox())!.height).toBe(controlSize);
      expect((await heroNext.locator("svg").boundingBox())!.height).toBe(14);
      const heroTrack = hero.locator("#hero-boosted-track");
      await hero
        .getByRole("button", { name: "Mettre le carrousel en pause" })
        .click();
      const initialSlide = await heroTrack.evaluate(
        (element) => element.scrollLeft,
      );
      await heroNext.click();
      await expect
        .poll(() => heroTrack.evaluate((element) => element.scrollLeft))
        .not.toBe(initialSlide);

      for (const type of ["recent_listings", "trending", "deals"]) {
        const section = page.getByTestId(`home-discovery-${type}`);
        await section.scrollIntoViewIfNeeded();
        const track = section.locator(".overflow-x-auto");
        const previous = section.getByRole("button", {
          name: /vers la gauche/,
        });
        const next = section.getByRole("button", { name: /vers la droite/ });
        // A rail that fits its viewport has nothing to scroll to and shows
        // no control at all; the contract is only on rails that overflow.
        const railOverflows = await track.evaluate(
          (element) => element.scrollWidth > element.clientWidth + 2,
        );
        if (!railOverflows) {
          await expect(next).toHaveCount(0);
          await expect(previous).toHaveCount(0);
          continue;
        }
        await expect(next).toBeVisible();
        await expect(previous).toHaveCount(0);
        // Both boxes from one frame: the page may still be settling from the
        // scroll, and two round trips would compare positions half a pixel
        // apart.
        const [trackBox, buttonBox] = await track.evaluate(
          (element, button) => {
            const box = (node: Element) => {
              const rect = node.getBoundingClientRect();
              return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              };
            };
            return [box(element), box(button as Element)];
          },
          await next.elementHandle(),
        );
        expect(buttonBox.height).toBe(controlSize);
        expect(buttonBox.width).toBe(controlSize);
        expect(buttonBox.y + buttonBox.height / 2).toBeCloseTo(
          trackBox.y + trackBox.height / 2,
          0,
        );
        await next.click();
        await expect
          .poll(() => track.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
        await expect(previous).toBeVisible();
        await track.evaluate((element) =>
          element.scrollTo({ left: element.scrollWidth, behavior: "instant" }),
        );
        await expect(next).toHaveCount(0);
        const end = await track.evaluate((element) => element.scrollLeft);
        await previous.focus();
        await page.keyboard.press("Enter");
        await expect
          .poll(() => track.evaluate((element) => element.scrollLeft))
          .toBeLessThan(end);
      }
      const collections = page.getByTestId("home-collection-explorer");
      await collections.scrollIntoViewIfNeeded();
      const collectionTrack = collections.locator(".overflow-x-auto");
      const overflows = await collectionTrack.evaluate(
        (element) => element.scrollWidth > element.clientWidth + 2,
      );
      const collectionNext = collections.getByRole("button", {
        name: /vers la droite/,
      });
      if (overflows) await expect(collectionNext).toBeVisible();
      else await expect(collectionNext).toHaveCount(0);
      await expectNoHorizontalOverflow(page, "homepage rail arrows");
    });
  });
}
