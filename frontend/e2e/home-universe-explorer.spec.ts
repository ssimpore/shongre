import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.describe("Homepage universe explorer", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
  });

  test("shows corresponding, harmonized listing rails in every universe", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const explorer = page.getByTestId("home-universe-explorer");
    await explorer.scrollIntoViewIfNeeded();
    await expect(
      explorer.getByRole("heading", { name: "Explorez par univers" }),
    ).toBeVisible();
    await expect(
      explorer.getByText("Trouvez rapidement ce qui vous intéresse"),
    ).toBeVisible();

    const home = explorer.locator('[data-home-universe-group="maison-jardin"]');
    const vehicles = explorer.locator('[data-home-universe-group="vehicules"]');
    const fashion = explorer.locator('[data-home-universe-group="mode"]');
    await expect(explorer.locator("[data-home-universe-group]")).toHaveCount(3);
    await expect(
      home.getByRole("heading", { name: "Maison & Jardin" }),
    ).toBeVisible();
    await expect(
      vehicles.getByRole("heading", { name: "Véhicules" }),
    ).toBeAttached();
    await expect(fashion.getByRole("heading", { name: "Mode" })).toBeAttached();

    await expect(home.locator("[data-listing-card]")).toHaveCount(4);
    await expect(vehicles.locator("[data-listing-card]")).toHaveCount(6);
    await expect(fashion.locator("[data-listing-card]")).toHaveCount(1);

    const cards = explorer.locator("[data-listing-card]");
    await expect(cards).toHaveCount(11);
    expect(
      await cards.evaluateAll((elements) =>
        elements.every(
          (element) =>
            element.getAttribute("data-listing-card-variant") === "showcase",
        ),
      ),
    ).toBe(true);
    const radiusContract = await cards.evaluateAll((elements) => {
      const rootStyles = getComputedStyle(document.documentElement);
      const listingToken = rootStyles
        .getPropertyValue("--radius-listing-card")
        .trim();
      const controlToken = rootStyles
        .getPropertyValue("--radius-control")
        .trim();
      const rootFontSize = Number.parseFloat(rootStyles.fontSize);
      const expectedPixels = Number.parseFloat(listingToken) * rootFontSize;

      return {
        listingToken,
        controlToken,
        expectedPixels,
        renderedPixels: elements.map((card) =>
          Number.parseFloat(getComputedStyle(card).borderTopLeftRadius),
        ),
      };
    });
    expect(radiusContract.listingToken).toBe(radiusContract.controlToken);
    for (const renderedPixels of radiusContract.renderedPixels) {
      expect(renderedPixels).toBeCloseTo(radiusContract.expectedPixels, 1);
    }
    for (const group of [home, vehicles, fashion]) {
      await group.scrollIntoViewIfNeeded();
      const heights = await group
        .locator("[data-listing-card]")
        .evaluateAll((elements) =>
          elements.map((element) =>
            Math.round(element.getBoundingClientRect().height),
          ),
        );
      expect(new Set(heights)).toEqual(new Set([384]));
    }

    await expect(
      home.getByRole("link", {
        name: /Don : Lot de 15 Pots de Fleurs en Terre Cuite/i,
      }),
    ).toHaveAttribute("href", "/annonce/list-110");
    await expect(
      fashion.getByRole("link", { name: /Manteau Long en Laine Sézane/i }),
    ).toHaveAttribute("href", "/annonce/list-105");

    await expect(home.getByRole("link", { name: "Voir tout" })).toHaveAttribute(
      "href",
      "/categorie/maison-jardin",
    );
    await expect(
      vehicles.getByRole("link", { name: "Voir tout" }),
    ).toHaveAttribute("href", "/categorie/vehicules");
    await expect(
      fashion.getByRole("link", { name: "Voir tout" }),
    ).toHaveAttribute("href", "/categorie/mode");

    const discovery = page.getByTestId("home-discovery-deals");
    const collections = page.getByTestId("home-collection-explorer");
    const order = await page.locator("main").evaluate(() => {
      const deals = document.querySelector(
        '[data-testid="home-discovery-deals"]',
      );
      const universes = document.querySelector(
        '[data-testid="home-universe-explorer"]',
      );
      const collection = document.querySelector(
        '[data-testid="home-collection-explorer"]',
      );
      if (!deals || !universes || !collection) return false;
      return (
        Boolean(
          deals.compareDocumentPosition(universes) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ) &&
        Boolean(
          universes.compareDocumentPosition(collection) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    });
    await expect(discovery).toBeAttached();
    await expect(collections).toBeAttached();
    expect(order).toBe(true);
    await expectNoHorizontalOverflow(page, "homepage universe explorer");
  });

  test("keeps the listing rail usable on mobile and category actions navigable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const explorer = page.getByTestId("home-universe-explorer");
    const vehicles = explorer.locator('[data-home-universe-group="vehicules"]');
    await vehicles.scrollIntoViewIfNeeded();
    await expect(vehicles.locator("[data-listing-card]")).toHaveCount(6);

    const rail = vehicles.locator(".overflow-x-auto");
    const dimensions = await rail.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    await expect(vehicles.locator(".listing-rail-control")).toBeHidden();

    const initialScroll = await rail.evaluate((element) => element.scrollLeft);
    await rail.evaluate((element) =>
      element.scrollBy({ left: element.clientWidth, behavior: "instant" }),
    );
    await expect
      .poll(() => rail.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(initialScroll);
    await expectNoHorizontalOverflow(page, "mobile universe listing rail");

    await vehicles.getByRole("link", { name: "Voir tout" }).click();
    await expect(page).toHaveURL(/\/categorie\/vehicules$/);
  });
});
